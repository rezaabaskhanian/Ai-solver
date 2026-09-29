import sympy


class LogB(sympy.Function):
    """Logarithm with an explicit base, kept unevaluated.

    sympy's own log(a, b) immediately becomes log(a)/log(b) (natural
    logs), which would lose the textbook notation log₂(x) that the
    logarithm-equation steps need to show and reason about ("log₂(A) = c
    means A = 2^c"). Solvers that just need the value convert with
    `to_real_logs` first.

    Iranian textbooks write log(x) for base 10 and ln(x) for base e, so
    the parser builds LogB(x, 10) for a bare log(x) and sympy's log for
    ln(x).
    """

    nargs = 2

    @classmethod
    def eval(cls, arg, base):
        return None


def to_real_logs(expr: sympy.Expr) -> sympy.Expr:
    """Replace every LogB with sympy's real log — exact where possible,
    e.g. log₂(8) -> 3, log(100) -> 2."""
    if not isinstance(expr, sympy.Basic) or not expr.has(LogB):
        return expr
    return expr.replace(LogB, lambda arg, base: sympy.log(arg, base))


def symbolic_logs(expr: sympy.Expr, symbol: sympy.Symbol) -> list[LogB]:
    """The LogB terms whose argument depends on `symbol`."""
    return [atom for atom in expr.atoms(LogB) if atom.args[0].has(symbol)]
