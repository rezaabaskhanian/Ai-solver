from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_parse_linear_equation():
    resp = client.post("/parse", json={"input": "2x + 5 = 17"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "linear_equation"
    assert body["problem"] == "2x + 5 = 17"


def test_parse_invalid_input_returns_422():
    resp = client.post("/parse", json={"input": "x + y = 3"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "parse_error"


def test_solve_linear_equation_matches_prd_example():
    resp = client.post("/solve", json={"problem": "2x + 5 = 17"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer"] == "x = 6"
    assert body["verified"] is True
    assert body["type"] == "linear_equation"
    assert [s["operation"] for s in body["steps"]] == ["subtract", "divide"]


def test_solve_quadratic_equation():
    resp = client.post("/solve", json={"problem": "x² - 5x + 6 = 0"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["verified"] is True
    assert "x = 2" in body["answer"] and "x = 3" in body["answer"]


def test_solve_unsupported_degree_returns_422():
    resp = client.post("/solve", json={"problem": "x^5 - 1 = 0"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "parse_error"


def test_solve_arithmetic_equation_true():
    resp = client.post("/solve", json={"problem": "2 + 2 = 4"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer"] == "True"
    assert body["verified"] is True


def test_solve_arithmetic_equation_false_fails_verification():
    resp = client.post("/solve", json={"problem": "2 + 2 = 5"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "verification_failed"


def test_solve_plain_expression():
    resp = client.post("/solve", json={"problem": "2*(3 + 4)"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["answer"] == "14"
    assert body["type"] == "arithmetic"


def test_solve_derivative():
    resp = client.post("/solve", json={"problem": "d/dx(x^2 + 3x)"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "derivative"
    assert body["answer"] == "2x + 3"
    assert body["verified"] is True
    assert body["steps"][0]["operation"] == "sum_rule"


def test_solve_integral():
    resp = client.post("/solve", json={"problem": "∫x^2 dx"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "integral"
    assert body["answer"] == "x^3/3 + C"
    assert body["verified"] is True
    assert body["steps"][-1]["operation"] == "add_constant"


def test_solve_unsupported_integral_returns_422():
    resp = client.post("/solve", json={"problem": "integrate(sin(sin(x)), x)"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "unsupported_problem_type"


def test_solve_trig_simplification():
    resp = client.post("/solve", json={"problem": "sin(x)^2 + cos(x)^2"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "trig_expression"
    assert body["answer"] == "1"
    assert body["verified"] is True


def test_check_correct_steps():
    resp = client.post("/check", json={
        "problem": "2x + 5 = 17", "student_steps": ["2x = 12", "x = 6"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "correct_and_solved"
    assert body["step_statuses"] == ["correct", "correct"]
    assert body["first_error_index"] is None


def test_check_catches_mistake():
    resp = client.post("/check", json={
        "problem": "2x + 5 = 17", "student_steps": ["2x = 22"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "incorrect"
    assert body["first_error_index"] == 0
    assert body["next_step_hint"] is not None


def test_check_invalid_problem_returns_422():
    resp = client.post("/check", json={"problem": "x + y = 3", "student_steps": []})
    assert resp.status_code == 422
    assert resp.json()["error"] == "parse_error"


def test_practice_generates_linear_equation():
    resp = client.post("/practice", json={"type": "linear_equation"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "linear_equation"
    assert "x" in body["problem"]


def test_practice_unsupported_type_returns_422():
    resp = client.post("/practice", json={"type": "derivative"})
    assert resp.status_code == 422
    assert resp.json()["error"] == "unsupported_problem_type"
