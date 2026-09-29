"""Vectors and coordinates (ریاضی هفتم فصل ۸، ریاضی هشتم فصل ۵).

Vectors are written as [x, y] (or [x, y, z]); points as A(1, 2). The
question is the last comma-separated part:

  [2, 3] + [1, -4]              sum
  3[2, -1] - [1, 5]             scalar multiple, difference
  A(1, 2), B(4, 6), AB          vector from A to B (B - A)
  A(1, 2), B(4, 6), |AB|        its length
  |[3, 4]|                      length

Computed component by component (the way the textbook does it on
paper), then re-checked with sympy.Matrix in verify_vector.
"""
import re
from dataclasses import dataclass
from typing import Union

import sympy

from .formatting import format_expr
from .messages import explained
from .schemas_internal import StepData

_POINT = re.compile(r"([A-Z])\((.+)\)")
_SCALAR = re.compile(r"\d+(?:\.\d+)?(?:/\d+)?")


class VectorError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def looks_like_vectors(compact: str) -> bool:
    return "[" in compact or bool(re.search(r"(^|,)[A-Z]\(-?[\d.]+,", compact))


# ---------- syntax tree ----------

@dataclass(frozen=True)
class Vec:
    components: tuple


@dataclass(frozen=True)
class FromPoints:
    start: str
    end: str


@dataclass(frozen=True)
class Scale:
    factor: sympy.Expr
    operand: "VNode"


@dataclass(frozen=True)
class Sum:
    op: str  # "+" | "-"
    left: "VNode"
    right: "VNode"


@dataclass(frozen=True)
class Length:
    operand: "VNode"


VNode = Union[Vec, FromPoints, Scale, Sum, Length]


@dataclass
class VectorProblem:
    points: dict[str, tuple]
    target: VNode

    @property
    def display(self) -> str:
        parts = [f"{name}{_fmt_tuple(p, '(', ')')}" for name, p in self.points.items()]
        parts.append(display_vnode(self.target))
        return ", ".join(parts)


# ---------- parsing ----------

def _split_top_level(text: str) -> list[str]:
    parts, depth, start = [], 0, 0
    for i, ch in enumerate(text):
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


def _number(text: str) -> sympy.Expr:
    try:
        value = sympy.Rational(text) if re.fullmatch(r"-?[\d./]+", text) else sympy.sympify(text)
    except Exception as exc:
        raise VectorError(f"'{text}' is not a number") from exc
    if value.free_symbols:
        raise VectorError(f"'{text}' is not a number")
    return value


def _components(text: str) -> tuple:
    items = _split_top_level(text)
    if len(items) not in (2, 3):
        raise VectorError("A vector or point needs 2 (or 3) coordinates")
    return tuple(_number(item) for item in items)


class _Reader:
    def __init__(self, text: str):
        self.text, self.pos = text, 0

    def peek(self) -> str:
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def take(self, expected: str) -> None:
        if self.peek() != expected:
            raise VectorError(f"Expected '{expected}' in '{self.text}'")
        self.pos += 1

    def expression(self) -> VNode:
        negate = False
        if self.peek() == "-":
            self.pos += 1
            negate = True
        node = self.term()
        if negate:
            node = Scale(sympy.Integer(-1), node)
        while self.peek() in ("+", "-"):
            op = self.peek()
            self.pos += 1
            node = Sum(op, node, self.term())
        return node

    def term(self) -> VNode:
        m = _SCALAR.match(self.text, self.pos)
        if m and m.end() < len(self.text) and self.text[m.end()] in "*[(ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            self.pos = m.end()
            if self.peek() == "*":
                self.pos += 1
            return Scale(sympy.Rational(m.group(0)), self.atom())
        return self.atom()

    def atom(self) -> VNode:
        ch = self.peek()
        if ch == "[":
            end = self._closing("[", "]")
            node = Vec(_components(self.text[self.pos + 1:end]))
            self.pos = end + 1
            return node
        if ch == "(":
            self.pos += 1
            node = self.expression()
            self.take(")")
            return node
        if ch == "|":
            self.pos += 1
            node = self.expression()
            self.take("|")
            return Length(node)
        two = self.text[self.pos:self.pos + 2]
        if len(two) == 2 and two.isalpha() and two.isupper():
            self.pos += 2
            return FromPoints(two[0], two[1])
        raise VectorError(f"Could not read the vector expression '{self.text}'")

    def _closing(self, open_ch: str, close_ch: str) -> int:
        depth = 0
        for i in range(self.pos, len(self.text)):
            if self.text[i] == open_ch:
                depth += 1
            elif self.text[i] == close_ch:
                depth -= 1
                if depth == 0:
                    return i
        raise VectorError(f"Missing '{close_ch}'")


def parse_vector_problem(compact: str) -> VectorProblem:
    parts = [p for p in _split_top_level(compact) if p]
    if not parts:
        raise VectorError("Input is empty")
    points: dict[str, tuple] = {}
    for part in parts[:-1]:
        m = _POINT.fullmatch(part)
        if not m:
            raise VectorError(f"'{part}' should be a point, e.g. A(1,2)")
        points[m.group(1)] = _components(m.group(2))
    reader = _Reader(parts[-1])
    target = reader.expression()
    if reader.pos != len(parts[-1]):
        raise VectorError(f"Could not read the vector expression '{parts[-1]}'")
    _check_lengths_only_at_top(target, top=True)
    return VectorProblem(points, target)


def _check_lengths_only_at_top(node: VNode, top: bool) -> None:
    if isinstance(node, Length):
        if not top:
            raise VectorError("A length |...| is a number; it can only be the whole question")
        _check_lengths_only_at_top(node.operand, False)
    elif isinstance(node, Scale):
        _check_lengths_only_at_top(node.operand, False)
    elif isinstance(node, Sum):
        _check_lengths_only_at_top(node.left, False)
        _check_lengths_only_at_top(node.right, False)


# ---------- formatting ----------

def _fmt_tuple(values, open_ch: str = "[", close_ch: str = "]") -> str:
    return open_ch + ", ".join(format_expr(v) for v in values) + close_ch


def format_vector(values) -> str:
    return _fmt_tuple(values)


def _paren(v: sympy.Expr) -> str:
    """Wrap negatives and fractions: 3×(-1), (1/2)×4."""
    s = format_expr(v)
    return f"({s})" if s.startswith("-") or "/" in s else s


def display_vnode(node: VNode, top: bool = True) -> str:
    if isinstance(node, Vec):
        return format_vector(node.components)
    if isinstance(node, FromPoints):
        return f"{node.start}{node.end}"
    if isinstance(node, Length):
        return f"|{display_vnode(node.operand)}|"
    if isinstance(node, Scale):
        if node.factor == -1:
            return f"-{display_vnode(node.operand, False)}"
        return f"{format_expr(node.factor)}{display_vnode(node.operand, False)}"
    text = f"{display_vnode(node.left, False)} {node.op} {display_vnode(node.right, False)}"
    return text if top else f"({text})"


# ---------- solving ----------

def solve_vector(problem: VectorProblem) -> tuple[list[StepData], str, object]:
    """Returns (steps, answer text, value): a tuple of components, or a
    number for a length."""
    steps: list[StepData] = []

    def add(before: str, after: str, operation: str, key: str, **params) -> None:
        steps.append(StepData(
            id=len(steps) + 1, before=before, after=after, operation=operation,
            value=None, target="expression", **explained(key, **params),
        ))

    value = _evaluate(problem.target, problem.points, add)
    if isinstance(value, tuple):
        return steps, format_vector(value), value
    return steps, format_expr(value), value


def _evaluate(node: VNode, points: dict[str, tuple], add):
    if isinstance(node, Vec):
        return node.components
    if isinstance(node, FromPoints):
        for name in (node.start, node.end):
            if name not in points:
                raise VectorError(f"Point {name} isn't given, e.g. write {name}(1,2) first")
        start, end = points[node.start], points[node.end]
        if len(start) != len(end):
            raise VectorError("The points have different numbers of coordinates")
        result = tuple(e - s for s, e in zip(start, end))
        work = "[" + ", ".join(f"{format_expr(e)} - {_paren(s)}" for s, e in zip(start, end)) + "]"
        add(f"{node.start}{node.end} = {node.end} - {node.start}", f"{work} = {format_vector(result)}",
            "vector_from_points", "vec_from_points",
            start=node.start, end=node.end)
        return result
    if isinstance(node, Scale):
        inner = _evaluate(node.operand, points, add)
        result = tuple(node.factor * c for c in inner)
        k = format_expr(node.factor)
        add(f"{k if node.factor != -1 else '-'}{format_vector(inner)}",
            "[" + ", ".join(f"{_paren(node.factor)}×{_paren(c)}" for c in inner) + f"] = {format_vector(result)}",
            "scale", "vec_scale", k=k)
        return result
    if isinstance(node, Length):
        inner = _evaluate(node.operand, points, add)
        squares = sum(c ** 2 for c in inner)
        length = sympy.sqrt(squares)
        work = " + ".join(f"{_paren(c)}^2" for c in inner)
        after = f"√({work}) = √{format_expr(squares)}"
        if length.is_Rational:  # √25 = 5; √2 stays √2
            after += f" = {format_expr(length)}"
        add(f"|{format_vector(inner)}|", after, "length", "vec_length")
        return length

    left = _evaluate(node.left, points, add)
    right = _evaluate(node.right, points, add)
    if len(left) != len(right):
        raise VectorError("Vectors with different numbers of components can't be added")
    sign = 1 if node.op == "+" else -1
    result = tuple(a + sign * b for a, b in zip(left, right))
    work = "[" + ", ".join(f"{format_expr(a)} {node.op} {_paren(b)}" for a, b in zip(left, right)) + "]"
    add(f"{format_vector(left)} {node.op} {format_vector(right)}", f"{work} = {format_vector(result)}",
        "add" if sign == 1 else "subtract", "vec_add" if sign == 1 else "vec_subtract")
    return result


def verify_vector(problem: VectorProblem, value) -> bool:
    """Recompute with sympy.Matrix (column vectors) and compare."""
    try:
        result = _matrix_eval(problem.target, problem.points)
        if isinstance(result, sympy.Matrix):
            return isinstance(value, tuple) and list(result) == list(value)
        return sympy.simplify(result - value) == 0
    except Exception:
        return False


def _matrix_eval(node: VNode, points: dict[str, tuple]):
    if isinstance(node, Vec):
        return sympy.Matrix(node.components)
    if isinstance(node, FromPoints):
        return sympy.Matrix(points[node.end]) - sympy.Matrix(points[node.start])
    if isinstance(node, Scale):
        return node.factor * _matrix_eval(node.operand, points)
    if isinstance(node, Length):
        return _matrix_eval(node.operand, points).norm()
    left, right = _matrix_eval(node.left, points), _matrix_eval(node.right, points)
    return left + right if node.op == "+" else left - right
