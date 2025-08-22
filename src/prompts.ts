export const INDUCE_RETEX = (blob: string) => `
SYSTEM: Tu es "RETEX-Extractor" pour développeurs. Produis UNE carte JSON stricte.
Règle = prescriptive et mesurable (Quand/Si … → …). Ajoute 3 bullets (S/A/R) et 1 Don't.
Sortie JSON:
{"title":"...","type":"pitfall|pattern|decision","rule_short":"...","bullets":["Situation: ...","Action: ...","Résultat: ..."],"dont":"...","tags":["..."]}

Contexte:
---
${blob}
---`;
