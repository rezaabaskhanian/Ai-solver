package richerror

import (
	"errors"
	"testing"
)

func TestRichError_KindAndMessage(t *testing.T) {
	err := New(Op("service.Do")).WithKind(KindInvalid).WithMessage("bad input")

	if got := err.Kind(); got != KindInvalid {
		t.Fatalf("Kind() = %v, want %v", got, KindInvalid)
	}
	if got := err.Message(); got != "bad input" {
		t.Fatalf("Message() = %q, want %q", got, "bad input")
	}
	if got := err.Error(); got != "bad input" {
		t.Fatalf("Error() = %q, want %q", got, "bad input")
	}
}

func TestRichError_KindFallsThroughWrappedRichError(t *testing.T) {
	inner := New(Op("repo.Get")).WithKind(KindNotFound).WithMessage("not found")
	outer := New(Op("service.Get")).WithErr(inner)

	if got := outer.Kind(); got != KindNotFound {
		t.Fatalf("Kind() = %v, want %v (fallthrough to wrapped error)", got, KindNotFound)
	}
	if got := outer.Message(); got != "not found" {
		t.Fatalf("Message() = %q, want %q (fallthrough to wrapped error)", got, "not found")
	}
}

func TestRichError_MessageFallsBackToWrappedPlainError(t *testing.T) {
	outer := New(Op("service.Get")).WithErr(errors.New("boom"))

	if got := outer.Message(); got != "boom" {
		t.Fatalf("Message() = %q, want %q (fallback to wrapped error's Error())", got, "boom")
	}
	if got := outer.Kind(); got != 0 {
		t.Fatalf("Kind() = %v, want 0 (no kind set anywhere)", got)
	}
}

func TestRichError_UnwrapExposesCause(t *testing.T) {
	cause := errors.New("root cause")
	err := New(Op("service.Do")).WithErr(cause)

	if !errors.Is(err, cause) {
		t.Fatalf("errors.Is(err, cause) = false, want true")
	}
}

func TestRichError_ExplicitMessageWinsOverWrapped(t *testing.T) {
	inner := New(Op("repo.Get")).WithMessage("inner message")
	outer := New(Op("service.Get")).WithErr(inner).WithMessage("outer message")

	if got := outer.Message(); got != "outer message" {
		t.Fatalf("Message() = %q, want %q (explicit message should win)", got, "outer message")
	}
}
