import sympy


def verify_equation_root(lhs: sympy.Expr, rhs: sympy.Expr, symbol: sympy.Symbol, value: sympy.Expr) -> bool:
    """Substitute the candidate root back into the ORIGINAL (pre-expansion)
    equation and confirm both sides match, per PRD section 13.
    """
    try:
        left = lhs.subs(symbol, value)
        right = rhs.subs(symbol, value)
        return bool(sympy.simplify(left - right) == 0)
    except Exception:
        return False


def verify_integral(expr: sympy.Expr, symbol: sympy.Symbol, antiderivative: sympy.Expr) -> bool:
    """Differentiate the candidate antiderivative and confirm it matches
    the original integrand — the same verification philosophy as
    verify_equation_root, applied to integration instead of a root.
    """
    try:
        return bool(sympy.simplify(sympy.diff(antiderivative, symbol) - expr) == 0)
    except Exception:
        return False
