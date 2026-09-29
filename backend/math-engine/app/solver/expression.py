import sympy

from .formatting import format_expr
from .functions import to_real_logs
from .messages import explained
from .schemas_internal import StepData


def solve_expression(expr: sympy.Expr) -> tuple[list[StepData], sympy.Expr]:
    """Simplify a bare expression (no '=') — arithmetic or algebraic
    simplification per PRD section 3 ('Simplifying expressions',
    'Fractions', 'Powers').
    """
    simplified = sympy.nsimplify(sympy.simplify(to_real_logs(expr)), rational=True)
    steps: list[StepData] = []

    if simplified != expr:
        steps.append(StepData(
            id=1, before=format_expr(expr), after=format_expr(simplified),
            operation="simplify", value=None, target="expression",
            **explained("simplify"),
        ))

    return steps, simplified
