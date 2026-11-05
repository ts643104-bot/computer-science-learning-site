export const buildLessonPreview = (lesson) => {
  if (!lesson) return null

  return {
    id: lesson.id,
    title: lesson.title,
    subtitle: lesson.subtitle,
    minutes: lesson.minutes,
    lede: `${lesson.title}: ${lesson.subtitle}. افتح الدرس للتعرّف على موضوعه ومسار التعلّم المرتبط به.`,
    objectives: [
      `التعرّف على موضوع «${lesson.title}»`,
      `فهم المحاور التمهيدية في «${lesson.subtitle}»`,
    ],
    viz: [],
    blocks: [
      {
        type: "callout",
        variant: "tip",
        title: "محتوى الدرس التفصيلي قيد الإضافة",
        text: "الدرس مفتوح للعرض، لكن الشرح الكامل والأمثلة والاختبار لم تُضف بعد. لن نعرض محتوى مختلقًا بدل المادة التعليمية.",
      },
      {
        type: "h2",
        text: "موضوع الدرس",
      },
      {
        type: "p",
        text: `يتناول هذا الدرس «${lesson.title}» — ${lesson.subtitle}.`,
      },
      {
        type: "h2",
        text: "إزاي تستفيد من الدرس؟",
      },
      {
        type: "p",
        text: "راجع الدروس السابقة في نفس المسار، واكتب المصطلحات أو الأسئلة التي تريد توضيحها. عند إضافة الشرح التفصيلي سيظهر هنا مع أمثلة وتدريبات مرتبطة بموضوع الدرس.",
      },
    ],
    quiz: [],
    closing: "الدرس مفتوح الآن، وسيُضاف الشرح التفصيلي والاختبار في تحديث لاحق.",
  }
}
