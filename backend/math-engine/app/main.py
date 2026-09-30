import sympy
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .schemas import (
    CheckRequest,
    CheckResponse,
    ParseRequest,
    ParseResponse,
    PracticeRequest,
    PracticeResponse,
    SolveRequest,
    SolveResponse,
    Step,
)
from .solver.check import UnsupportedForCheck, check_student_work
from .solver.derivative import DerivativeUnsupported, solve_derivative_problem
from .solver.expression import solve_expression
from .solver.formatting import format_expr, format_roots
from .solver.geometry import GeometryError, solve_geometry, verify_geometry
from .solver.graphs import GraphError, solve_graph, verify_graph
from .solver.integral import IntegrationUnsupported, solve_definite_integral, solve_integral
from .solver.limit import LimitUnsupported, format_limit_value, solve_limit
from .solver.linear import solve_linear
from .solver.logarithm import (
    LogEquationUnsupported,
    solve_exponential_equation,
    solve_log_equation,
    verify_roots,
)
from .solver.messages import normalize_lang
from .solver.parser import ParseError, parse_problem
from .solver.plot import PlotError, solve_plot, verify_plot
from .solver.practice import UnsupportedPracticeType, generate_practice_problem
from .solver.quadratic import solve_quadratic
from .solver.cubic import CubicUnsupported, solve_cubic
from .solver.biquadratic import solve_biquadratic
from .solver.linear_system import solve_linear_system, verify_linear_system
from .solver.schemas_internal import StepData
from .solver.sets import SetsError, solve_sets, verify_sets
from .solver.vectors import VectorError, solve_vector, verify_vector
from .solver.verify import (
    verify_definite_integral,
    verify_derivative_at,
    verify_equation_root,
    verify_integral,
    verify_limit,
)

app = FastAPI(title="MathMotion Math Engine", version="0.1.0")


def _to_step(step: StepData, lang: str) -> Step:
    return Step(
        id=step.id, before=step.before, after=step.after,
        operation=step.operation, value=step.value, target=step.target,
        explanation=step.explanation_in(lang),
    )


def _unsupported(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "unsupported_problem_type", "message": message},
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/parse", response_model=ParseResponse)
def parse(req: ParseRequest):
    try:
        parsed = parse_problem(req.input)
    except ParseError as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "parse_error", "message": exc.message},
        )
    return ParseResponse(
        problem=parsed.display,
        type=parsed.problem_type,
        confidence=parsed.confidence,
    )


@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    try:
        parsed = parse_problem(req.problem)
    except ParseError as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "parse_error", "message": exc.message},
        )

    plot = None
    if parsed.problem_type == "linear_equation":
        step_data, final_value = solve_linear(parsed.lhs, parsed.rhs, parsed.symbol)
        verified = verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, final_value)
        answer = f"{parsed.symbol} = {format_expr(final_value)}"

    elif parsed.problem_type == "quadratic_equation":
        step_data, roots = solve_quadratic(parsed.lhs, parsed.rhs, parsed.symbol)
        # No roots only when Δ < 0, which the solver computed exactly.
        verified = all(
            verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r) for r in roots
        )
        answer = format_roots(parsed.symbol, roots)

    elif parsed.problem_type == "cubic_equation":
        try:
            step_data, roots = solve_cubic(parsed.lhs, parsed.rhs, parsed.symbol)
        except CubicUnsupported as exc:
            return _unsupported(exc.message)
        verified = all(
            verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r) for r in roots
        )
        answer = format_roots(parsed.symbol, roots)

    elif parsed.problem_type == "linear_system":
        step_data, answer, solution = solve_linear_system(parsed.structure)
        verified = verify_linear_system(parsed.structure, solution)

    elif parsed.problem_type == "biquadratic_equation":
        step_data, roots = solve_biquadratic(parsed.lhs, parsed.rhs, parsed.symbol)
        # Empty only when every t = x^2 was negative, which the steps show.
        verified = all(
            verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r) for r in roots
        )
        answer = format_roots(parsed.symbol, roots)

    elif parsed.problem_type in ("expression", "arithmetic", "trig_expression"):
        step_data, result = solve_expression(parsed.expr)
        verified = True
        answer = format_expr(result)

    elif parsed.problem_type == "arithmetic_equation":
        step_data = []
        is_true = bool(sympy.simplify(parsed.lhs - parsed.rhs) == 0)
        verified = is_true
        answer = "True" if is_true else "False"

    elif parsed.problem_type == "derivative":
        try:
            step_data, result = solve_derivative_problem(
                parsed.expr, parsed.symbol, parsed.derivative_order, parsed.derivative_at,
            )
        except DerivativeUnsupported as exc:
            return _unsupported(exc.message)
        # sympy.diff is an exact, deterministic transform (not a guessed
        # root), so there's nothing independent left to verify against —
        # unlike solve_linear/solve_quadratic's candidate roots. A value at
        # a point (f'(2)) is a number, though, and gets a numeric check.
        verified = parsed.derivative_at is None or verify_derivative_at(
            parsed.expr, parsed.symbol, parsed.derivative_at, parsed.derivative_order, result,
        )
        answer = format_expr(result)

    elif parsed.problem_type == "integral" and parsed.integral_bounds is not None:
        lower, upper = parsed.integral_bounds
        try:
            step_data, result = solve_definite_integral(parsed.expr, parsed.symbol, lower, upper)
        except IntegrationUnsupported as exc:
            return _unsupported(exc.message)
        verified = verify_definite_integral(parsed.expr, parsed.symbol, lower, upper, result)
        answer = format_expr(result)

    elif parsed.problem_type == "integral":
        try:
            step_data, result = solve_integral(parsed.expr, parsed.symbol)
        except IntegrationUnsupported as exc:
            return JSONResponse(
                status_code=422,
                content={"error": "unsupported_problem_type", "message": exc.message},
            )
        verified = verify_integral(parsed.expr, parsed.symbol, result)
        answer = f"{format_expr(result)} + C"

    elif parsed.problem_type == "limit":
        try:
            step_data, result, sides = solve_limit(
                parsed.expr, parsed.symbol, parsed.limit_point, parsed.limit_dir,
            )
        except LimitUnsupported as exc:
            return _unsupported(exc.message)
        verified = verify_limit(parsed.expr, parsed.symbol, parsed.limit_point, sides)
        answer = format_limit_value(result)

    elif parsed.problem_type == "set_operation":
        try:
            step_data, answer, value = solve_sets(parsed.structure)
        except SetsError as exc:
            return _unsupported(exc.message)
        verified = verify_sets(parsed.structure, value)

    elif parsed.problem_type == "geometry":
        try:
            step_data, answer, value = solve_geometry(parsed.structure)
        except GeometryError as exc:
            return _unsupported(exc.message)
        verified = verify_geometry(parsed.structure, value)

    elif parsed.problem_type == "graph":
        try:
            step_data, answer, value = solve_graph(parsed.structure)
        except GraphError as exc:
            return _unsupported(exc.message)
        verified = verify_graph(parsed.structure, value)

    elif parsed.problem_type == "function_plot":
        try:
            step_data, answer, plot = solve_plot(parsed.structure)
        except PlotError as exc:
            return _unsupported(exc.message)
        verified = verify_plot(parsed.structure, plot)

    elif parsed.problem_type == "vector":
        try:
            step_data, answer, value = solve_vector(parsed.structure)
        except VectorError as exc:
            return _unsupported(exc.message)
        verified = verify_vector(parsed.structure, value)

    elif parsed.problem_type in ("log_equation", "exponential_equation"):
        solver = (solve_log_equation if parsed.problem_type == "log_equation"
                  else solve_exponential_equation)
        try:
            step_data, roots = solver(parsed.lhs, parsed.rhs, parsed.symbol)
        except LogEquationUnsupported as exc:
            return _unsupported(exc.message)
        verified = verify_roots(parsed.lhs, parsed.rhs, parsed.symbol, roots)
        # "∅": every candidate root fell outside the domain (or none existed).
        answer = " or ".join(f"{parsed.symbol} = {format_expr(r)}" for r in roots) or "∅"

    else:
        return JSONResponse(
            status_code=422,
            content={
                "error": "unsupported_problem_type",
                "message": f"'{parsed.problem_type}' is not supported yet.",
            },
        )

    lang = normalize_lang(req.lang)
    steps = [_to_step(s, lang) for s in step_data]

    if not verified:
        return JSONResponse(
            status_code=422,
            content={
                "error": "verification_failed",
                "message": "The computed solution did not verify against the original equation.",
            },
        )

    return SolveResponse(
        problem=parsed.display, answer=answer, verified=verified,
        type=parsed.problem_type, steps=steps, plot=plot,
    )


@app.post("/check", response_model=CheckResponse)
def check(req: CheckRequest):
    try:
        parsed = parse_problem(req.problem)
    except ParseError as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "parse_error", "message": exc.message},
        )

    try:
        outcome = check_student_work(
            parsed.problem_type, parsed.lhs, parsed.rhs, parsed.expr,
            parsed.symbol, req.student_steps,
        )
    except UnsupportedForCheck as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "unsupported_problem_type", "message": exc.message},
        )

    lang = normalize_lang(req.lang)
    hint = _to_step(outcome.next_step_hint, lang) if outcome.next_step_hint else None
    return CheckResponse(
        status=outcome.status,
        step_statuses=outcome.step_statuses,
        first_error_index=outcome.first_error_index,
        next_step_hint=hint,
        correct_answer=outcome.correct_answer,
    )


@app.post("/practice", response_model=PracticeResponse)
def practice(req: PracticeRequest):
    try:
        problem = generate_practice_problem(req.type)
    except UnsupportedPracticeType as exc:
        return JSONResponse(
            status_code=422,
            content={"error": "unsupported_problem_type", "message": exc.message},
        )
    return PracticeResponse(problem=problem, type=req.type)
