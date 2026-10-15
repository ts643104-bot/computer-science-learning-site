// ============================================================
// scoring.js — قواعد النقاط (Score) في مكان واحد
// ============================================================

// إجمالي عدد الدروس — مصدر واحد للحقيقة.
// ملاحظة: الدروس الفعلية متعرّفة في الفرونت إند (client) وبالمناسبة
// 20 درس علوم حاسب (cs-01..cs-20) + 20 درس شبكات (net-01..net-20) = 40.
// لو زوّدت أو قلّلت دروس، غيّر الرقم هنا بس (أو مرّره عبر متغير البيئة
// TOTAL_LESSONS) وكل حاجات النسبة المئوية والمستوى هتتحدّث أوتوماتيك.
const TOTAL_LESSONS = Number(process.env.TOTAL_LESSONS) || 40

const POINTS = {
  LESSON_DONE: 10, // خلّص درس كامل
  PER_CORRECT: 5, // كل إجابة صح في الاختبار القصير
  PERFECT_BONUS: 10, // بونص لما تجيب كل الأسئلة صح
  FIRST_BLOOD: 15, // بونص أول درس تخلّصه في حسابك
}

// بيحسب نقاط محاولة اختبار واحدة
function quizPoints(correct, total) {
  const c = Math.max(0, Math.min(Number(correct) || 0, Number(total) || 0))
  const t = Math.max(1, Number(total) || 1)
  let pts = c * POINTS.PER_CORRECT
  if (c === t) pts += POINTS.PERFECT_BONUS
  return { points: pts, perfect: c === t }
}

// مستوى القارئ حسب عدد الدروس اللي خلّصها
function progressLevel(doneCount, totalLessons) {
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0
  const tiers = [
    { at: 0, name: 'مبتدئ' },
    { at: 15, name: 'متوسط' },
    { at: 40, name: 'متقدم' },
    { at: 70, name: 'محترف' },
  ]
  let tier = tiers[0]
  for (const t of tiers) if (pct >= t.at) tier = t
  return { pct, tier: tier.name }
}

module.exports = { POINTS, quizPoints, progressLevel, TOTAL_LESSONS }
