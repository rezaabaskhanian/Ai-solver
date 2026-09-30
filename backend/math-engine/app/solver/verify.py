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


def verify_derivative_at(expr: sympy.Expr, symbol: sympy.Symbol, point: sympy.Expr,
                         order: int, value: sympy.Expr) -> bool:
    """Check f'(a) / f''(a) with a central finite difference at 50-digit
    precision — independent of sympy.diff, like verify_limit's samples."""
    try:
        h = sympy.Rational(1, 10**6)

        def f(t: sympy.Expr) -> sympy.Expr:
            return sympy.N(expr.subs(symbol, t), 50)

        if order == 1:
            approx = (f(point + h) - f(point - h)) / (2 * h)
        else:
            approx = (f(point + h) - 2 * f(point) + f(point - h)) / h**2
        approx = complex(sympy.N(approx, 30))
        expected = float(value)
        return abs(approx.imag) < 1e-9 and abs(approx.real - expected) <= 1e-4 * (1 + abs(expected))
    except Exception:
        return False


def verify_definite_integral(expr: sympy.Expr, symbol: sympy.Symbol, lower: sympy.Expr,
                             upper: sympy.Expr, value: sympy.Expr) -> bool:
    """Numeric quadrature of the integral against the exact value."""
    try:
        approx = complex(sympy.Integral(expr, (symbol, lower, upper)).evalf(30))
        expected = float(value)
        return abs(approx.imag) < 1e-9 and abs(approx.real - expected) <= 1e-6 * (1 + abs(expected))
    except Exception:
        return False


def verify_limit(expr: sympy.Expr, symbol: sympy.Symbol, point: sympy.Expr,
                 sides: dict[str, sympy.Expr]) -> bool:
    """Check each one-sided limit sympy.limit gave by actually evaluating
    the function very close to the point (or very far out, at ±∞) — an
    independent numeric check, the limit counterpart of substituting a
    root back into the equation.

    Finite value L: f is within 1e-3 of L at the nearest sample.
    ±∞: f has that sign at both samples and |f| keeps growing (slow
    blow-ups like ln(x) at 0 still pass).
    """
    try:
        for side, expected in sides.items():
            if point.is_infinite:
                sign = -1 if point == -sympy.oo else 1
                samples = [sign * sympy.Integer(10)**k for k in (4, 8)]
            else:
                sign = 1 if side == "+" else -1
                samples = [point + sign * sympy.Rational(1, 10**k) for k in (4, 8)]
            values = [complex(sympy.N(expr.subs(symbol, s), 30)) for s in samples]
            if any(abs(v.imag) > 1e-12 for v in values):
                return False
            near, nearer = values[0].real, values[1].real
            if expected in (sympy.oo, -sympy.oo):
                want = 1 if expected == sympy.oo else -1
                if not (near * want > 0 and nearer * want > 0
                        and abs(nearer) > abs(near) and abs(nearer) > 10):
                    return False
            elif abs(nearer - float(expected)) > 1e-3 * (1 + abs(float(expected))):
                return False
        return True
    except Exception:
        return False
