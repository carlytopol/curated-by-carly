export function requestsRecommendationSuppression(question: string) {
  return /\b(?:take|remove|keep)\b[\s\S]{0,90}\b(?:out of (?:the )?(?:recommendation )?rotation|out of recommendations|from recommendations)\b|\b(?:never|do not|don['’]t)\s+(?:recommend|suggest|use)\b/i.test(question);
}

export function requestsRecommendationRestoration(question: string) {
  return /\b(?:restore|allow|resume|put|add)\b[\s\S]{0,90}\b(?:rotation|recommendations?|suggestions?)\b/i.test(question);
}
