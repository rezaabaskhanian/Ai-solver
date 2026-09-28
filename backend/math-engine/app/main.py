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
from .solver.derivative import solve_derivative
from .solver.expression import solve_expression
from .solver.formatting import format_expr
from .solver.integral import IntegrationUnsupported, solve_integral
from .solver.linear import solve_linear
from .solver.parser import ParseError, parse_problem
from .solver.practice import UnsupportedPracticeType, generate_practice_problem
from .solver.quadratic import solve_quadratic
from .solver.verify import verify_equation_root, verify_integral

app = FastAPI(title="MathMotion Math Engine", version="0.1.0")


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

    if parsed.problem_type == "linear_equation":
        step_data, final_value = solve_linear(parsed.lhs, parsed.rhs, parsed.symbol)
        verified = verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, final_value)
        answer = f"{parsed.symbol} = {format_expr(final_value)}"

    elif parsed.problem_type == "quadratic_equation":
        step_data, roots = solve_quadratic(parsed.lhs, parsed.rhs, parsed.symbol)
        verified = all(
            verify_equation_root(parsed.lhs, parsed.rhs, parsed.symbol, r) for r in roots
        ) if roots else False
        answer = " or ".join(f"{parsed.symbol} = {format_expr(r)}" for r in roots)

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
        step_data, result = solve_derivative(parsed.expr, parsed.symbol)
        # sympy.diff is an exact, deterministic transform (not a guessed
        # root), so there's nothing independent left to verify against —
        # unlike solve_linear/solve_quadratic's candidate roots.
        verified = True
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

    else:
        return JSONResponse(
            status_code=422,
            content={
                "error": "unsupported_problem_type",
                "message": f"'{parsed.problem_type}' is not supported yet.",
            },
        )

    steps = [Step(**s.__dict__) for s in step_data]

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
        type=parsed.problem_type, steps=steps,
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

    hint = Step(**outcome.next_step_hint.__dict__) if outcome.next_step_hint else None
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
