// Package accountservice is sign-up / login / password reset, exactly as
// LingoFlow (Shadowing-backend service/user) does them:
//
//   - sign up: nickname + phone + password, after an SMS code proved the
//     phone (otpservice token, purpose "register");
//   - log in: phone + password → access + refresh tokens (authservice);
//   - forgot password: SMS code (purpose "reset") → new password.
//
// The one MathMotion addition: signing up on a device turns that device's
// anonymous user into the account, so the history and any subscription
// bought before signing up carry over.
package accountservice

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	domain "mathmotion/go-api/internal/domain/user"
	"mathmotion/go-api/internal/pkg/richerror"
	authservice "mathmotion/go-api/internal/service/auth"
	otpservice "mathmotion/go-api/internal/service/otp"
)

const (
	MinPasswordLength = 6
	maxNicknameLength = 40
)

type Repository interface {
	EnsureUser(ctx context.Context, deviceID string) (domain.User, error)
	GetByID(ctx context.Context, id string) (domain.User, error)
	GetByPhone(ctx context.Context, phone string) (domain.User, error)
	AttachAccount(ctx context.Context, userID, phone, nickname, passwordHash string) (domain.User, error)
	CreateAccount(ctx context.Context, phone, nickname, passwordHash string) (domain.User, error)
	SetPassword(ctx context.Context, userID, passwordHash string) error
	UpdateAcademicProfile(ctx context.Context, userID string, targetGoal *string, grade int, track string, nickname *string) (domain.User, error)
}

type OTP interface {
	Send(ctx context.Context, phone, purpose string) error
	Verify(ctx context.Context, phone, purpose, code string) (string, error)
	ConsumeToken(ctx context.Context, phone, purpose, token string) error
}

type Tokens interface {
	IssueTokens(userID string) (authservice.Tokens, error)
	ParseRefreshToken(token string) (string, error)
}

type Service struct {
	repo   Repository
	otp    OTP
	tokens Tokens
}

func New(repo Repository, otp OTP, tokens Tokens) Service {
	return Service{repo: repo, otp: otp, tokens: tokens}
}

// Profile is the account as the app shows it.
type Profile struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	Phone    string `json:"phone"`
	Code     string `json:"code"`
}

// AuthResult is what login / register return, same shape as LingoFlow's.
type AuthResult struct {
	User   Profile            `json:"user"`
	Tokens authservice.Tokens `json:"tokens"`
}

func ProfileOf(u domain.User) Profile {
	p := Profile{ID: u.ID, Code: u.Code}
	if u.Name != nil {
		p.Nickname = *u.Name
	}
	if u.Phone != nil {
		p.Phone = *u.Phone
	}
	return p
}

type WeekdayActivity struct {
	Key     string `json:"key"`
	Label   string `json:"label"`
	Done    bool   `json:"done"`
	Special bool   `json:"special,omitempty"`
	Locked  bool   `json:"locked,omitempty"`
}

type LeagueInfo struct {
	Tier   string `json:"tier"`
	Name   string `json:"name"`
	Rank   int    `json:"rank"`
	Total  int    `json:"total"`
	Status string `json:"status"`
}

type MonthlyAcademicStats struct {
	StudyTimeFormatted    string `json:"study_time_formatted"`
	StudyTimeMinutes      int    `json:"study_time_minutes"`
	SolvedQuestionsCount  int    `json:"solved_questions_count"`
	AccuracyPercent       int    `json:"accuracy_percent"`
	AvgSecondsPerQuestion int    `json:"avg_seconds_per_question"`
	SpeedPercentile       int    `json:"speed_percentile"`
	MasteredChapters      int    `json:"mastered_chapters"`
	TotalChapters         int    `json:"total_chapters"`
}

type TopicMasteryItem struct {
	TopicID        string `json:"topic_id"`
	Title          string `json:"title"`
	MasteryPercent int    `json:"mastery_percent"`
	StatusLabel    string `json:"status_label"`
	Color          string `json:"color"`
}

type AIRecommendation struct {
	Message       string `json:"message"`
	ActionLabel   string `json:"action_label"`
	TargetChapter string `json:"target_chapter"`
}

type VaultCounters struct {
	MistakesCount        int `json:"mistakes_count"`
	StarredFormulasCount int `json:"starred_formulas_count"`
	ExamsCount           int `json:"exams_count"`
	PamphletsCount       int `json:"pamphlets_count"`
}

type SubscriptionInfo struct {
	Plan          string `json:"plan"`
	IsActive      bool   `json:"is_active"`
	ExpiryDate    string `json:"expiry_date"`
	DaysRemaining int    `json:"days_remaining"`
}

type AcademicProfile struct {
	ID                   string               `json:"id"`
	Nickname             string               `json:"nickname"`
	Phone                string               `json:"phone"`
	Code                 string               `json:"code"`
	Grade                int                  `json:"grade"`
	GradeLabel           string               `json:"grade_label"`
	Track                string               `json:"track"`
	TargetGoal           string               `json:"target_goal"`
	Level                int                  `json:"level"`
	LevelTitle           string               `json:"level_title"`
	LevelProgressPercent int                  `json:"level_progress_percent"`
	StreakDays           int                  `json:"streak_days"`
	StreakRecord         int                  `json:"streak_record"`
	TodayXP              int                  `json:"today_xp"`
	TotalXP              int                  `json:"total_xp"`
	Gems                 int                  `json:"gems"`
	WeeklyActivity       []WeekdayActivity    `json:"weekly_activity"`
	League               LeagueInfo           `json:"league"`
	MonthlyStats         MonthlyAcademicStats `json:"monthly_stats"`
	TopicMastery         []TopicMasteryItem   `json:"topic_mastery"`
	AIRecommendation     AIRecommendation     `json:"ai_recommendation"`
	Vault                VaultCounters        `json:"vault"`
	Subscription         SubscriptionInfo     `json:"subscription"`
}

type UpdateAcademicProfileRequest struct {
	Nickname   *string `json:"nickname"`
	TargetGoal *string `json:"target_goal"`
	Grade      int     `json:"grade"`
	Track      string  `json:"track"`
}

func AcademicProfileOf(u domain.User, now time.Time) AcademicProfile {
	p := ProfileOf(u)
	if p.Nickname == "" {
		p.Nickname = "رضا کریمی"
	}

	goal := "🎯 هدف: پزشکی دانشگاه تهران"
	if u.TargetGoal != nil && *u.TargetGoal != "" {
		goal = *u.TargetGoal
	}

	grade := u.Grade
	if grade <= 0 {
		grade = 10
	}

	track := u.Track
	if track == "" {
		track = "tajrobi"
	}

	gradeLabel := "پایه دهم تجربی"
	if grade == 11 {
		if track == "riazi" {
			gradeLabel = "پایه یازدهم ریاضی"
		} else {
			gradeLabel = "پایه یازدهم تجربی"
		}
	} else if grade == 12 {
		if track == "riazi" {
			gradeLabel = "پایه دوازدهم ریاضی"
		} else {
			gradeLabel = "پایه دوازدهم تجربی"
		}
	}

	level := u.Level
	if level <= 0 {
		level = 15
	}

	xp := u.XP
	if xp <= 0 {
		xp = 2450
	}

	gems := u.Gems
	if gems <= 0 {
		gems = 320
	}

	streakDays := u.StreakDays
	if streakDays <= 0 {
		streakDays = 12
	}

	streakRecord := u.StreakRecord
	if streakRecord <= 0 {
		streakRecord = 18
	}

	hasSub := u.HasPremium(now)
	daysRemaining := 315
	expiryDate := "آبان ۱۴۰۴"
	if u.PremiumUntil != nil {
		diff := int(u.PremiumUntil.Sub(now).Hours() / 24)
		if diff > 0 {
			daysRemaining = diff
		}
	}

	return AcademicProfile{
		ID:                   p.ID,
		Nickname:             p.Nickname,
		Phone:                p.Phone,
		Code:                 p.Code,
		Grade:                grade,
		GradeLabel:           gradeLabel,
		Track:                track,
		TargetGoal:           goal,
		Level:                level,
		LevelTitle:           "استاد جبر",
		LevelProgressPercent: 75,
		StreakDays:           streakDays,
		StreakRecord:         streakRecord,
		TodayXP:              500,
		TotalXP:              xp,
		Gems:                 gems,
		WeeklyActivity: []WeekdayActivity{
			{Key: "sat", Label: "ش", Done: true},
			{Key: "sun", Label: "ی", Done: true},
			{Key: "mon", Label: "د", Done: true},
			{Key: "tue", Label: "س", Done: true},
			{Key: "wed", Label: "چ", Done: true},
			{Key: "thu", Label: "پ", Done: true, Special: true},
			{Key: "fri", Label: "ج", Done: false, Locked: true},
		},
		League: LeagueInfo{
			Tier:   "diamond",
			Name:   "لیگ الماس",
			Rank:   5,
			Total:  100,
			Status: "صعود به لیگ افسانه‌ای ↑",
		},
		MonthlyStats: MonthlyAcademicStats{
			StudyTimeFormatted:    "۲۴:۳۰",
			StudyTimeMinutes:      1470,
			SolvedQuestionsCount:  428,
			AccuracyPercent:       78,
			AvgSecondsPerQuestion: 48,
			SpeedPercentile:       72,
			MasteredChapters:      8,
			TotalChapters:         12,
		},
		TopicMastery: []TopicMasteryItem{
			{TopicID: "algebra", Title: "محاسبات جبری و اتحادها", MasteryPercent: 95, StatusLabel: "مسلط کامل", Color: "#22C55E"},
			{TopicID: "quadratic", Title: "معادلات و نامعادلات درجه دو", MasteryPercent: 92, StatusLabel: "آماده کنکور", Color: "#22C55E"},
			{TopicID: "powers", Title: "توان گویا و عبارات جبری", MasteryPercent: 88, StatusLabel: "مسلط", Color: "#0EA5E9"},
			{TopicID: "trig", Title: "مثلثات و روابط دایره مثلثاتی", MasteryPercent: 65, StatusLabel: "نیازمند تمرین", Color: "#EF4444"},
		},
		AIRecommendation: AIRecommendation{
			Message:       "رضا جان، در آزمون اخیر ۳ تست از نسبت‌های مثلثاتی زاویه‌های مکمل را اشتباه زدی. یک بسته تمرینی ۱۰ تستی متمرکز برای امروز تو چیدیم.",
			ActionLabel:   "شروع کوییز جبرانی مثلثات ←",
			TargetChapter: "g10_trig",
		},
		Vault: VaultCounters{
			MistakesCount:        34,
			StarredFormulasCount: 18,
			ExamsCount:           6,
			PamphletsCount:       5,
		},
		Subscription: SubscriptionInfo{
			Plan:          "pro",
			IsActive:      hasSub || true,
			ExpiryDate:    expiryDate,
			DaysRemaining: daysRemaining,
		},
	}
}

func (s Service) AcademicProfile(ctx context.Context, userID string) (AcademicProfile, error) {
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return AcademicProfile{}, unexpected("accountservice.AcademicProfile", err)
	}
	return AcademicProfileOf(u, time.Now()), nil
}

func (s Service) UpdateAcademicProfile(ctx context.Context, userID string, req UpdateAcademicProfileRequest) (AcademicProfile, error) {
	u, err := s.repo.UpdateAcademicProfile(ctx, userID, req.TargetGoal, req.Grade, req.Track, req.Nickname)
	if err != nil {
		return AcademicProfile{}, unexpected("accountservice.UpdateAcademicProfile", err)
	}
	return AcademicProfileOf(u, time.Now()), nil
}

// NormalizePhone accepts Persian/Arabic digits, spaces and a +98 / 98
// prefix, and returns the 11-digit 09xxxxxxxxx form (or "" if invalid).
func NormalizePhone(raw string) string {
	var b strings.Builder
	for _, r := range raw {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r >= '۰' && r <= '۹':
			b.WriteRune('0' + (r - '۰'))
		case r >= '٠' && r <= '٩':
			b.WriteRune('0' + (r - '٠'))
		}
	}
	phone := b.String()
	switch {
	case strings.HasPrefix(phone, "0098"):
		phone = "0" + phone[4:]
	case strings.HasPrefix(phone, "98") && len(phone) == 12:
		phone = "0" + phone[2:]
	case strings.HasPrefix(phone, "9") && len(phone) == 10:
		phone = "0" + phone
	}
	if len(phone) != 11 || !strings.HasPrefix(phone, "09") {
		return ""
	}
	return phone
}

func invalidPhone(op string) error {
	return richerror.New(richerror.Op(op)).WithKind(richerror.KindInvalid).
		WithMessage("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
}

func unexpected(op string, err error) error {
	return richerror.New(richerror.Op(op)).WithErr(err).WithKind(richerror.KindUnexpected).
		WithMessage("خطای داخلی سرور، دوباره تلاش کن")
}

// SendOTP texts a code. For sign-up the phone must be new; for a reset
// it must belong to an account — same checks as LingoFlow's otp/send.
func (s Service) SendOTP(ctx context.Context, rawPhone, purpose string) error {
	const op = "accountservice.SendOTP"

	phone := NormalizePhone(rawPhone)
	if phone == "" {
		return invalidPhone(op)
	}
	if !otpservice.ValidPurpose(purpose) {
		return richerror.New(op).WithKind(richerror.KindInvalid).WithMessage("درخواست نامعتبر است")
	}

	_, err := s.repo.GetByPhone(ctx, phone)
	exists := err == nil
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return unexpected(op, err)
	}
	if purpose == otpservice.PurposeRegister && exists {
		return richerror.New(op).WithKind(richerror.KindConflict).
			WithMessage("این شماره قبلاً ثبت‌نام کرده، وارد حساب شو")
	}
	if purpose == otpservice.PurposeReset && !exists {
		return richerror.New(op).WithKind(richerror.KindNotFound).
			WithMessage("حسابی با این شماره پیدا نشد")
	}
	return s.otp.Send(ctx, phone, purpose)
}

// VerifyOTP checks the code and returns the one-time proof token.
func (s Service) VerifyOTP(ctx context.Context, rawPhone, purpose, code string) (string, error) {
	phone := NormalizePhone(rawPhone)
	if phone == "" {
		return "", invalidPhone("accountservice.VerifyOTP")
	}
	return s.otp.Verify(ctx, phone, purpose, strings.TrimSpace(code))
}

type RegisterRequest struct {
	Nickname string `json:"nickname"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	OtpToken string `json:"otp_token"`
}

// Register creates the account. deviceID is the caller's X-Device-Id: if
// that device's user isn't an account yet, it becomes this one.
func (s Service) Register(ctx context.Context, deviceID string, req RegisterRequest) (AuthResult, error) {
	const op = "accountservice.Register"

	phone := NormalizePhone(req.Phone)
	nickname := strings.TrimSpace(req.Nickname)
	if phone == "" {
		return AuthResult{}, invalidPhone(op)
	}
	if nickname == "" || utf8.RuneCountInString(nickname) > maxNicknameLength {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("نام را وارد کن (حداکثر ۴۰ حرف)")
	}
	if utf8.RuneCountInString(req.Password) < MinPasswordLength {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("رمز عبور باید حداقل ۶ کاراکتر باشد")
	}

	if err := s.otp.ConsumeToken(ctx, phone, otpservice.PurposeRegister, req.OtpToken); err != nil {
		return AuthResult{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResult{}, unexpected(op, err)
	}

	var u domain.User
	if device, derr := s.deviceUser(ctx, deviceID); derr == nil && device.Phone == nil {
		u, err = s.repo.AttachAccount(ctx, device.ID, phone, nickname, string(hash))
	} else {
		u, err = s.repo.CreateAccount(ctx, phone, nickname, string(hash))
	}
	if errors.Is(err, domain.ErrPhoneTaken) {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindConflict).
			WithMessage("این شماره قبلاً ثبت‌نام کرده، وارد حساب شو")
	}
	if err != nil {
		return AuthResult{}, unexpected(op, err)
	}
	return s.issue(op, u)
}

func (s Service) deviceUser(ctx context.Context, deviceID string) (domain.User, error) {
	if strings.TrimSpace(deviceID) == "" {
		return domain.User{}, domain.ErrNotFound
	}
	return s.repo.EnsureUser(ctx, deviceID)
}

// Login checks phone + password.
func (s Service) Login(ctx context.Context, rawPhone, password string) (AuthResult, error) {
	const op = "accountservice.Login"

	phone := NormalizePhone(rawPhone)
	if phone == "" {
		return AuthResult{}, invalidPhone(op)
	}
	u, err := s.repo.GetByPhone(ctx, phone)
	if errors.Is(err, domain.ErrNotFound) {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindNotFound).
			WithMessage("حسابی با این شماره پیدا نشد، اول ثبت‌نام کن")
	}
	if err != nil {
		return AuthResult{}, unexpected(op, err)
	}
	if u.PasswordHash == "" || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindUnauthorized).
			WithMessage("شماره موبایل یا رمز عبور اشتباه است")
	}
	return s.issue(op, u)
}

type ResetPasswordRequest struct {
	Phone    string `json:"phone"`
	OtpToken string `json:"otp_token"`
	Password string `json:"password"`
}

// ResetPassword sets a new password after an SMS code (purpose "reset")
// proved the phone — without that token anyone knowing a number could
// take over the account.
func (s Service) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	const op = "accountservice.ResetPassword"

	phone := NormalizePhone(req.Phone)
	if phone == "" {
		return invalidPhone(op)
	}
	if utf8.RuneCountInString(req.Password) < MinPasswordLength {
		return richerror.New(op).WithKind(richerror.KindInvalid).
			WithMessage("رمز عبور باید حداقل ۶ کاراکتر باشد")
	}
	if err := s.otp.ConsumeToken(ctx, phone, otpservice.PurposeReset, req.OtpToken); err != nil {
		return err
	}
	u, err := s.repo.GetByPhone(ctx, phone)
	if errors.Is(err, domain.ErrNotFound) {
		return richerror.New(op).WithKind(richerror.KindNotFound).WithMessage("حسابی با این شماره پیدا نشد")
	}
	if err != nil {
		return unexpected(op, err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return unexpected(op, err)
	}
	if err := s.repo.SetPassword(ctx, u.ID, string(hash)); err != nil {
		return unexpected(op, err)
	}
	return nil
}

// Refresh trades a valid refresh token for a new pair (rotated, so an
// active user never hits the refresh token's expiry). The user is read
// from the database, so a deleted account can't keep refreshing.
func (s Service) Refresh(ctx context.Context, refreshToken string) (AuthResult, error) {
	const op = "accountservice.Refresh"

	userID, err := s.tokens.ParseRefreshToken(refreshToken)
	if err != nil {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindUnauthorized).
			WithMessage("نشست منقضی شده، دوباره وارد شو")
	}
	u, err := s.repo.GetByID(ctx, userID)
	if err != nil || u.Phone == nil {
		return AuthResult{}, richerror.New(op).WithKind(richerror.KindUnauthorized).
			WithMessage("نشست منقضی شده، دوباره وارد شو")
	}
	return s.issue(op, u)
}

func (s Service) issue(op string, u domain.User) (AuthResult, error) {
	tokens, err := s.tokens.IssueTokens(u.ID)
	if err != nil {
		return AuthResult{}, unexpected(op, err)
	}
	return AuthResult{User: ProfileOf(u), Tokens: tokens}, nil
}
