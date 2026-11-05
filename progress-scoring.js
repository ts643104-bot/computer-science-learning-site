export const getQuizPoints = (correct, total) => {
  if (
    !Number.isInteger(correct)
    || !Number.isInteger(total)
    || total < 1
    || correct < 0
    || correct > total
  ) {
    return 0
  }

  return correct * 5 + (correct === total ? 10 : 0)
}
