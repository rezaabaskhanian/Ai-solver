"""Sets (ریاضی نهم فصل ۱، ریاضی دهم فصل ۱، آمار و احتمال یازدهم).

Two kinds of problem, both written as comma-separated parts with the
question last:

  A={1,2,3}, B={2,3,4}, (A∪B)-A        operations on listed sets
  U={1,...}, A={1,2}, A'                complement (needs U)
  A={1,2,3}, n(P(A))                    count elements / subsets
  n(A)=5, n(B)=7, n(A∩B)=3, n(A∪B)      counting formula, no listed sets

Operators: ∪ ∩ and - (or \\) for difference, ' for complement, P(...)
for the power set, n(...) to count. Different operators at one level
need parentheses (A∪B∩C is ambiguous in textbook notation too).

Answers are computed with Python sets and then re-checked independently
with sympy's FiniteSet (verify_sets), same "compute, then verify"
philosophy as the equation solvers.
"""
import re
from dataclasses import dataclass
from itertools import combinations
from typing import Optional, Union

import sympy

from .formatting import format_expr
from .linear import solve_linear
from .messages import explained
from .schemas_internal import StepData

_OPERATORS = {"∪": "union", "∩": "intersection", "-": "difference", "\\": "difference"}
_OP_SYMBOL = {"union": "∪", "intersection": "∩", "difference": "-"}
_MAX_POWER_SET_LISTING = 4  # 16 subsets; larger ones are only counted
_NUMBER = re.compile(r"-?\d+(?:\.\d+)?(?:/\d+)?")
_WORD = re.compile(r"[a-z]+")


class SetsError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


# ---------- syntax tree ----------

@dataclass(frozen=True)
class Literal:
    elements: frozenset


@dataclass(frozen=True)
class Name:
    name: str


@dataclass(frozen=True)
class BinOp:
    op: str  # "union" | "intersection" | "difference"
    left: "Node"
    right: "Node"


@dataclass(frozen=True)
class Complement:
    operand: "Node"


@dataclass(frozen=True)
class PowerSet:
    operand: "Node"


Node = Union[Literal, Name, BinOp, Complement, PowerSet]


@dataclass
class SetProblem:
    definitions: dict[str, Node]
    facts: dict[str, tuple[Node, int]]  # canonical key -> (node, n)
    target: Node
    count: bool  # the question is n(target)

    @property
    def display(self) -> str:
        parts = [f"{name} = {display_node(node)}" for name, node in self.definitions.items()]
        parts += [f"n({display_node(node)}) = {n}" for node, n in self.facts.values()]
        target = display_node(self.target)
        parts.append(f"n({target})" if self.count else target)
        return ", ".join(parts)


def looks_like_sets(compact: str) -> bool:
    return bool(re.search(r"[{}∪∩∅]", compact))


# ---------- parsing ----------

def _split_top_level(text: str) -> list[str]:
    parts, depth, start = [], 0, 0
    for i, ch in enumerate(text):
        if ch in "({":
            depth += 1
        elif ch in ")}":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


class _Reader:
    def __init__(self, text: str):
        self.text, self.pos = text, 0

    def peek(self) -> str:
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def take(self, expected: str) -> None:
        if not self.text.startswith(expected, self.pos):
            raise SetsError(f"Expected '{expected}' in '{self.text}'")
        self.pos += len(expected)

    def expression(self) -> Node:
        node = self.term()
        op: Optional[str] = None
        while self.peek() in _OPERATORS:
            this_op = _OPERATORS[self.peek()]
            if op is not None and this_op != op:
                raise SetsError("Use parentheses when mixing different set operations, e.g. (A∪B)∩C")
            op = this_op
            self.pos += 1
            node = BinOp(op, node, self.term())
        return node

    def term(self) -> Node:
        node = self.atom()
        while self.peek() == "'":
            self.pos += 1
            node = Complement(node)
        return node

    def atom(self) -> Node:
        ch = self.peek()
        if ch == "{":
            return Literal(self.literal())
        if ch == "∅":
            self.pos += 1
            return Literal(frozenset())
        if ch == "(":
            self.pos += 1
            node = self.expression()
            self.take(")")
            return node
        if ch == "P" and self.text.startswith("P(", self.pos):
            self.pos += 2
            node = self.expression()
            self.take(")")
            return PowerSet(node)
        if ch.isupper():
            self.pos += 1
            return Name(ch)
        raise SetsError(f"Could not read the set expression '{self.text}'")

    def literal(self) -> frozenset:
        self.take("{")
        end = self.text.find("}", self.pos)
        if end < 0:
            raise SetsError("Missing '}'")
        body, self.pos = self.text[self.pos:end], end + 1
        if not body:
            return frozenset()
        return frozenset(_element(item) for item in body.split(","))


def _element(text: str) -> sympy.Basic:
    if _NUMBER.fullmatch(text):
        return sympy.Rational(text)
    if _WORD.fullmatch(text):
        return sympy.Symbol(text)
    raise SetsError(f"'{text}' is not a set element this version can read (use numbers or lowercase letters)")


def _parse_node(text: str) -> Node:
    reader = _Reader(text)
    node = reader.expression()
    if reader.pos != len(text):
        raise SetsError(f"Could not read the set expression '{text}'")
    return node


def parse_set_problem(compact: str) -> SetProblem:
    """`compact` is the normalized input with all whitespace removed."""
    parts = [p for p in _split_top_level(compact) if p]
    if not parts:
        raise SetsError("Input is empty")
    definitions: dict[str, Node] = {}
    facts: dict[str, tuple[Node, int]] = {}

    for part in parts[:-1]:
        definition = re.fullmatch(r"([A-Z])=(.+)", part)
        fact = re.fullmatch(r"n\((.+)\)=(\d+)", part)
        if fact:
            node = _parse_node(fact.group(1))
            facts[_canonical(node)] = (node, int(fact.group(2)))
        elif definition:
            definitions[definition.group(1)] = _parse_node(definition.group(2))
        else:
            raise SetsError(f"'{part}' should define a set, e.g. A={{1,2,3}}")

    question = parts[-1]
    if "=" in question:
        raise SetsError("Put the question last, e.g. A={1,2}, B={2,3}, A∪B")
    counted = re.fullmatch(r"n\((.+)\)", question)
    target = _parse_node(counted.group(1) if counted else question)
    if facts and not counted:
        raise SetsError("With n(...) facts, ask for a count, e.g. n(A∪B)")
    return SetProblem(definitions, facts, target, bool(counted))


# ---------- formatting ----------

def _element_key(e) -> tuple:
    if isinstance(e, frozenset):
        return (2, len(e), sorted(map(_element_key, e)))
    if e.is_number:
        return (0, float(e), "")
    return (1, 0.0, str(e))


def format_set(s: frozenset) -> str:
    if not s:
        return "∅"
    items = sorted(s, key=_element_key)
    return "{" + ", ".join(format_set(e) if isinstance(e, frozenset) else format_expr(e)
                           for e in items) + "}"


def display_node(node: Node, top: bool = True) -> str:
    if isinstance(node, Literal):
        return format_set(node.elements)
    if isinstance(node, Name):
        return node.name
    if isinstance(node, Complement):
        inner = display_node(node.operand, top=False)
        return f"{inner}'"
    if isinstance(node, PowerSet):
        return f"P({display_node(node.operand)})"
    text = f"{display_node(node.left, False)} {_OP_SYMBOL[node.op]} {display_node(node.right, False)}"
    return text if top else f"({text})"


# ---------- listed sets ----------

def solve_sets(problem: SetProblem) -> tuple[list[StepData], str, object]:
    """Returns (steps, answer text, value): value is a frozenset, or an
    int when the question is n(...)."""
    if problem.facts:
        return _solve_by_formula(problem)

    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    env: dict[str, frozenset] = {}
    for name, node in problem.definitions.items():
        env[name] = _evaluate(node, env, None)

    target = problem.target
    if problem.count and isinstance(target, PowerSet):
        inner = _evaluate(target.operand, env, add)
        k = len(inner)
        name = display_node(target.operand)
        add(f"n({name})", str(k), "count", "set_count", set=name)
        add(f"n(P({name})) = 2^{k}", str(2 ** k), "subsets_count", "set_subsets_count")
        return steps, str(2 ** k), 2 ** k

    value = _evaluate(target, env, add)
    if problem.count:
        add(format_set(value), str(len(value)), "count", "set_count", set=display_node(target))
        return steps, str(len(value)), len(value)
    return steps, format_set(value), value


def _evaluate(node: Node, env: dict[str, frozenset], add) -> frozenset:
    """Evaluate `node`; when `add` is given, record one step per operation."""
    if isinstance(node, Literal):
        return node.elements
    if isinstance(node, Name):
        if node.name not in env:
            raise SetsError(f"Set {node.name} isn't defined, e.g. write {node.name}={{1,2,3}} first")
        return env[node.name]
    if isinstance(node, Complement):
        if "U" not in env:
            raise SetsError("A complement needs the universal set, e.g. U={1,2,3,4,5}")
        inner = _evaluate(node.operand, env, add)
        if not inner <= env["U"]:
            raise SetsError(f"{display_node(node.operand)} isn't a subset of U")
        result = env["U"] - inner
        if add:
            add(f"U - {format_set(inner)}", format_set(result), "complement",
                "set_complement", set=display_node(node.operand))
        return result
    if isinstance(node, PowerSet):
        inner = _evaluate(node.operand, env, add)
        if len(inner) > _MAX_POWER_SET_LISTING:
            raise SetsError(
                f"{display_node(node.operand)} has {2 ** len(inner)} subsets — too many to list; "
                f"ask for n(P({display_node(node.operand)})) instead"
            )
        result = frozenset(frozenset(c) for k in range(len(inner) + 1)
                           for c in _combinations(inner, k))
        if add:
            add(f"P({format_set(inner)})", format_set(result), "power_set",
                "set_power_set", n=str(len(inner)), count=str(2 ** len(inner)))
        return result

    left = _evaluate(node.left, env, add)
    right = _evaluate(node.right, env, add)
    result = {"union": left | right, "intersection": left & right,
              "difference": left - right}[node.op]
    if add:
        add(f"{format_set(left)} {_OP_SYMBOL[node.op]} {format_set(right)}", format_set(result),
            node.op, f"set_{node.op}",
            left=display_node(node.left, False), right=display_node(node.right, False))
    return result


def _combinations(items: frozenset, k: int):
    return combinations(sorted(items, key=_element_key), k)


def verify_sets(problem: SetProblem, value) -> bool:
    """Recompute the answer with sympy's FiniteSet — an independent
    implementation of the same set algebra."""
    if problem.facts:
        return True  # checked inside _solve_by_formula with a linear system
    try:
        env = {}
        for name, node in problem.definitions.items():
            env[name] = _sympy_eval(node, env)
        target = problem.target
        if problem.count and isinstance(target, PowerSet):
            return 2 ** len(_sympy_eval(target.operand, env)) == value
        result = _sympy_eval(target, env)
        if problem.count:
            return len(result) == value
        return result == _to_finite_set(value)
    except Exception:
        return False


def _to_finite_set(s):
    if isinstance(s, frozenset):
        return sympy.FiniteSet(*(_to_finite_set(e) for e in s))
    return s


def _sympy_eval(node: Node, env: dict):
    if isinstance(node, Literal):
        return _to_finite_set(node.elements)
    if isinstance(node, Name):
        return env[node.name]
    if isinstance(node, Complement):
        return sympy.Complement(env["U"], _sympy_eval(node.operand, env))
    if isinstance(node, PowerSet):
        return _sympy_eval(node.operand, env).powerset()
    left, right = _sympy_eval(node.left, env), _sympy_eval(node.right, env)
    if node.op == "union":
        return sympy.Union(left, right)
    if node.op == "intersection":
        return sympy.Intersection(left, right)
    return sympy.Complement(left, right)


# ---------- counting formula: n(A∪B) = n(A) + n(B) - n(A∩B) ----------

def _canonical(node: Node) -> str:
    """Order-free key for the quantities the counting formulas use."""
    if isinstance(node, Name):
        return node.name
    if (isinstance(node, BinOp) and isinstance(node.left, Name)
            and isinstance(node.right, Name) and node.left != node.right):
        a, b = node.left.name, node.right.name
        if node.op in ("union", "intersection"):
            a, b = sorted((a, b))
        return f"{a}{_OP_SYMBOL[node.op]}{b}"
    return display_node(node)


# n(lhs) = Σ coefficient·n(term); "1" and "2" stand for the two set
# names in alphabetical order (digits, so they can't clash with a name).
_FORMULAS: list[tuple[str, list[tuple[int, str]]]] = [
    ("1∪2", [(1, "1"), (1, "2"), (-1, "1∩2")]),
    ("1-2", [(1, "1"), (-1, "1∩2")]),
    ("2-1", [(1, "2"), (-1, "1∩2")]),
    ("1∪2", [(1, "1-2"), (1, "2")]),
    ("1∪2", [(1, "1"), (1, "2-1")]),
    ("1∪2", [(1, "1-2"), (1, "2-1"), (1, "1∩2")]),
]


def _solve_by_formula(problem: SetProblem) -> tuple[list[StepData], str, int]:
    names = sorted({ch for key in [*problem.facts, _canonical(problem.target)]
                    for ch in key if ch.isupper()})
    if len(names) != 2:
        raise SetsError("Counting formulas work with exactly two sets, e.g. A and B")
    X, Y = names

    def concrete(key: str) -> str:
        return key.replace("1", X).replace("2", Y)

    def shown(key: str) -> str:
        return f"n({concrete(key).replace('∪', ' ∪ ').replace('∩', ' ∩ ').replace('-', ' - ')})"

    known = {key: n for key, (_, n) in problem.facts.items()}
    target = _canonical(problem.target)
    expected = _check_consistent(known, target, X, Y)

    for lhs, terms in _FORMULAS:
        keys = [lhs] + [k for _, k in terms]
        concrete_keys = [concrete(k) for k in keys]
        if target not in concrete_keys:
            continue
        if not all(k == target or k in known for k in concrete_keys):
            continue

        steps: list[StepData] = []
        unknown = sympy.Symbol("x")

        def quantity(key: str) -> sympy.Expr:
            c = concrete(key)
            return unknown if c == target else sympy.Integer(known[c])

        formula = f"{shown(lhs)} = " + " ".join(
            f"{'-' if c < 0 else ('+' if i else '')} {shown(k)}".strip()
            for i, (c, k) in enumerate(terms)
        )
        lhs_value = quantity(lhs)
        rhs_value = sympy.Add(*(c * quantity(k) for c, k in terms))
        rhs_text = " ".join(
            f"{'-' if c < 0 else ('+' if i else '')} {format_expr(quantity(k))}".strip()
            for i, (c, k) in enumerate(terms)
        )
        steps.append(StepData(
            id=1, before=formula, after=f"{format_expr(lhs_value)} = {rhs_text}",
            operation="counting_formula", value=None, target="equation",
            **explained("set_formula", quantity=shown(target)),
        ))
        if lhs_value == unknown:
            result = rhs_value
            steps.append(StepData(
                id=2, before=rhs_text, after=format_expr(result),
                operation="compute", value=None, target="expression",
                **explained("simplify"),
            ))
        else:
            sub_steps, result = solve_linear(lhs_value, rhs_value, unknown)
            for step in sub_steps:
                step.id = len(steps) + 1
                steps.append(step)
        if expected is not None and result != expected:
            raise SetsError("The counting formula and the linear system disagree")
        steps.append(StepData(
            id=len(steps) + 1, before=f"x = {format_expr(result)}",
            after=f"{shown(target)} = {format_expr(result)}",
            operation="conclude", value=None, target="expression",
            **explained("set_conclude", quantity=shown(target)),
        ))
        return steps, format_expr(result), int(result)

    raise SetsError("Not enough information to find this count")


def _check_consistent(known: dict[str, int], target: str, X: str, Y: str) -> Optional[sympy.Integer]:
    """Solve the facts as a linear system in n(X), n(Y), n(X∩Y): rejects
    impossible data (n(A∩B) > n(A), negative counts...) and gives the
    value the formula-based steps must agree with."""
    a, b, i = sympy.symbols("a b i")
    # X < Y (sorted), matching _canonical's order for ∪ and ∩.
    meaning = {
        X: a, Y: b, f"{X}∩{Y}": i, f"{X}∪{Y}": a + b - i,
        f"{X}-{Y}": a - i, f"{Y}-{X}": b - i,
    }
    for key in [*known, target]:
        if key not in meaning:
            raise SetsError(f"n({key}) isn't a quantity the counting formulas cover")
    equations = [sympy.Eq(meaning[k], n) for k, n in known.items()]
    solutions = sympy.solve(equations, [a, b, i], dict=True)
    if not solutions:
        raise SetsError("These numbers contradict each other")
    solution = solutions[0]
    for quantity in (a, b, i, a - i, b - i):
        value = quantity.subs(solution)
        if value.is_number and value < 0:
            raise SetsError("These numbers are impossible: a count would be negative")
    value = meaning[target].subs(solution)
    return value if value.is_number else None
