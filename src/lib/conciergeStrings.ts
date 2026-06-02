/**
 * conciergeStrings — UI chrome translations for strings adjacent to the
 * AI response surface (FloatingChat widget + Storefront AI summary card).
 *
 * Scope: only the strings that sit RIGHT NEXT to the LLM's translated
 * answer body. The LLM body is translated via buildPrefix() ("Respond in
 * Spanish: ..."). Without these chrome translations the answer reads
 * half-localised — Spanish prose wrapped in English controls.
 *
 * Page-level chrome (route headers, persona toggles, top nav) is
 * deliberately NOT translated here — that's a separate scope.
 *
 * Languages cover env.languages defaults: English, Spanish, French,
 * German, Japanese, Mandarin. English-confident translations only for
 * Spanish and French; German/Japanese/Mandarin are machine-translated and
 * marked for review (the English equivalent is in the // comment).
 */

export type StringKey =
  | 'inputPlaceholderShopper'
  | 'inputPlaceholderMember'
  | 'sendAriaLabel'
  | 'newQuestion'
  | 'closeAriaLabel'
  | 'emptyStateShopper'
  | 'emptyStateMember'
  | 'showHowBuilt'
  | 'pipelineStep1'
  | 'pipelineStep2Template'
  | 'pipelineStep3MemberTemplate'
  | 'pipelineStep3ShopperTemplate'
  | 'pipelineStep4'
  | 'sourcesSingular'
  | 'sourcesPlural'
  | 'citedFrom'
  | 'memberVoice'
  | 'shopperVoice';

type Dict = Record<StringKey, string>;

// English — source of truth. All other languages map back to these.
const en: Dict = {
  inputPlaceholderShopper: 'What gear are you looking for?',
  inputPlaceholderMember: 'Ask anything…',
  sendAriaLabel: 'Send',
  newQuestion: 'New question',
  closeAriaLabel: 'Close',
  emptyStateShopper: 'Ask me about gear, trails, or what would work for your trip.',
  emptyStateMember:
    'Member access. Ask me for detailed gear advice, ambassador picks, or member-exclusive recommendations.',
  showHowBuilt: 'Show how this was built',
  pipelineStep1: 'Hybrid retrieval — keyword + semantic search across the Aurora knowledge base.',
  pipelineStep2Template: 'Top {n} grounded passages selected; each cited in the answer.',
  pipelineStep3MemberTemplate:
    'Member voice system prompt applied (max-6-sentence rule, multi-source citations).',
  pipelineStep3ShopperTemplate:
    'Shopper voice system prompt applied (max-3-sentence rule, single field-engineered CTA).',
  pipelineStep4: 'Streamed token-by-token to this widget.',
  sourcesSingular: 'source',
  sourcesPlural: 'sources',
  citedFrom: 'Cited from',
  memberVoice: 'Member voice',
  shopperVoice: 'Shopper voice',
};

const es: Dict = {
  inputPlaceholderShopper: '¿Qué equipo estás buscando?',
  inputPlaceholderMember: 'Pregunta lo que quieras…',
  sendAriaLabel: 'Enviar',
  newQuestion: 'Nueva pregunta',
  closeAriaLabel: 'Cerrar',
  emptyStateShopper: 'Pregúntame sobre equipo, rutas o qué te funcionaría para tu viaje.',
  emptyStateMember:
    'Acceso de miembro. Pregúntame por consejos detallados sobre equipo, recomendaciones de embajadores o sugerencias exclusivas para miembros.',
  showHowBuilt: 'Ver cómo se construyó esto',
  pipelineStep1:
    'Recuperación híbrida — búsqueda por palabra clave + semántica en la base de conocimiento de Aurora.',
  pipelineStep2Template: 'Se seleccionaron los {n} pasajes mejor fundamentados; cada uno citado en la respuesta.',
  pipelineStep3MemberTemplate:
    'Aplicado el prompt de voz de miembro (regla de máximo 6 frases, citas multi-fuente).',
  pipelineStep3ShopperTemplate:
    'Aplicado el prompt de voz de comprador (regla de máximo 3 frases, una única llamada a la acción).',
  pipelineStep4: 'Transmitido token a token a este widget.',
  sourcesSingular: 'fuente',
  sourcesPlural: 'fuentes',
  citedFrom: 'Citado de',
  memberVoice: 'Voz de miembro',
  shopperVoice: 'Voz de comprador',
};

const fr: Dict = {
  inputPlaceholderShopper: 'Quel équipement cherchez-vous ?',
  inputPlaceholderMember: 'Posez votre question…',
  sendAriaLabel: 'Envoyer',
  newQuestion: 'Nouvelle question',
  closeAriaLabel: 'Fermer',
  emptyStateShopper:
    'Demandez-moi des conseils sur l\'équipement, les sentiers ou ce qui conviendrait à votre voyage.',
  emptyStateMember:
    'Accès membre. Demandez-moi des conseils détaillés, des choix d\'ambassadeurs ou des recommandations exclusives aux membres.',
  showHowBuilt: 'Voir comment c\'est construit',
  pipelineStep1:
    'Récupération hybride — recherche par mots-clés + sémantique dans la base de connaissances Aurora.',
  pipelineStep2Template: '{n} passages les mieux étayés sélectionnés ; chacun cité dans la réponse.',
  pipelineStep3MemberTemplate:
    'Prompt système voix membre appliqué (règle de 6 phrases max, citations multi-sources).',
  pipelineStep3ShopperTemplate:
    'Prompt système voix client appliqué (règle de 3 phrases max, un seul appel à l\'action).',
  pipelineStep4: 'Diffusé jeton par jeton dans ce widget.',
  sourcesSingular: 'source',
  sourcesPlural: 'sources',
  citedFrom: 'Cité depuis',
  memberVoice: 'Voix membre',
  shopperVoice: 'Voix client',
};

// German — machine-translated; English in comments for review.
const de: Dict = {
  inputPlaceholderShopper: 'Welche Ausrüstung suchst du?', // What gear are you looking for?
  inputPlaceholderMember: 'Frag mich alles…', // Ask anything…
  sendAriaLabel: 'Senden', // Send
  newQuestion: 'Neue Frage', // New question
  closeAriaLabel: 'Schließen', // Close
  emptyStateShopper:
    'Frag mich nach Ausrüstung, Wegen oder was zu deiner Tour passt.', // Ask me about gear, trails, or what would work for your trip.
  emptyStateMember:
    'Mitgliederzugang. Frag mich nach detaillierter Beratung, Ambassador-Auswahl oder mitgliederexklusiven Empfehlungen.',
  showHowBuilt: 'Zeigen, wie das gebaut wurde', // Show how this was built
  pipelineStep1:
    'Hybride Suche — Stichwort + semantisch über die Aurora-Wissensdatenbank.',
  pipelineStep2Template: 'Top {n} fundierte Passagen ausgewählt; jede in der Antwort zitiert.',
  pipelineStep3MemberTemplate:
    'System-Prompt für Mitgliederstimme angewendet (max. 6 Sätze, Mehrfachzitate).',
  pipelineStep3ShopperTemplate:
    'System-Prompt für Käuferstimme angewendet (max. 3 Sätze, ein einziger CTA).',
  pipelineStep4: 'Token für Token an dieses Widget gestreamt.',
  sourcesSingular: 'Quelle', // source
  sourcesPlural: 'Quellen', // sources
  citedFrom: 'Zitiert aus', // Cited from
  memberVoice: 'Mitgliederstimme', // Member voice
  shopperVoice: 'Käuferstimme', // Shopper voice
};

// Japanese — machine-translated; English in comments for review.
const ja: Dict = {
  inputPlaceholderShopper: 'どんなギアをお探しですか？', // What gear are you looking for?
  inputPlaceholderMember: '何でも聞いてください…', // Ask anything…
  sendAriaLabel: '送信', // Send
  newQuestion: '新しい質問', // New question
  closeAriaLabel: '閉じる', // Close
  emptyStateShopper:
    'ギア、トレイル、旅にぴったりのものについてお尋ねください。',
  emptyStateMember:
    'メンバー専用。詳細なギアのアドバイス、アンバサダーのおすすめ、メンバー限定の提案をお尋ねください。',
  showHowBuilt: 'どのように構築されたかを表示', // Show how this was built
  pipelineStep1:
    'ハイブリッド検索 — Aurora ナレッジベースでのキーワード + 意味検索。',
  pipelineStep2Template: '根拠のある上位 {n} 件の段落を選択しました。それぞれ回答内で引用されています。',
  pipelineStep3MemberTemplate:
    'メンバーボイスのシステムプロンプトを適用（最大6文ルール、複数ソースの引用）。',
  pipelineStep3ShopperTemplate:
    'ショッパーボイスのシステムプロンプトを適用（最大3文ルール、単一のCTA）。',
  pipelineStep4: 'このウィジェットへトークン単位でストリーミング。',
  sourcesSingular: 'ソース', // source
  sourcesPlural: 'ソース', // sources (Japanese has no plural form)
  citedFrom: '引用元', // Cited from
  memberVoice: 'メンバーボイス', // Member voice
  shopperVoice: 'ショッパーボイス', // Shopper voice
};

// Mandarin (Simplified) — machine-translated; English in comments for review.
const zh: Dict = {
  inputPlaceholderShopper: '你在找什么装备？', // What gear are you looking for?
  inputPlaceholderMember: '随便问吧…', // Ask anything…
  sendAriaLabel: '发送', // Send
  newQuestion: '新问题', // New question
  closeAriaLabel: '关闭', // Close
  emptyStateShopper: '问我关于装备、路线或什么适合你的旅程。',
  emptyStateMember:
    '会员访问。问我详细的装备建议、大使精选或会员专属推荐。',
  showHowBuilt: '查看构建过程', // Show how this was built
  pipelineStep1:
    '混合检索 — 在 Aurora 知识库中进行关键字 + 语义搜索。',
  pipelineStep2Template: '选出前 {n} 段最具依据的内容；每条都在答案中引用。',
  pipelineStep3MemberTemplate:
    '已应用会员语气系统提示（最多6句规则，多源引用）。',
  pipelineStep3ShopperTemplate:
    '已应用购物者语气系统提示（最多3句规则，单一CTA）。',
  pipelineStep4: '逐令牌流式传输到此小部件。',
  sourcesSingular: '来源', // source
  sourcesPlural: '来源', // sources (Mandarin has no plural form)
  citedFrom: '引用自', // Cited from
  memberVoice: '会员语气', // Member voice
  shopperVoice: '购物者语气', // Shopper voice
};

const DICTIONARIES: Record<string, Dict> = {
  english: en,
  spanish: es,
  french: fr,
  german: de,
  japanese: ja,
  mandarin: zh,
  // also accept native names + common codes, just in case
  español: es,
  français: fr,
  deutsch: de,
  日本語: ja,
  中文: zh,
};

/**
 * Look up a translated chrome string for the active language. Falls back
 * to English on any unknown language. Keys are stable; callers can do
 * simple template fills (e.g. {n}) after lookup.
 */
export function t(language: string | undefined, key: StringKey): string {
  const dict = DICTIONARIES[(language ?? 'English').trim().toLowerCase()] ?? en;
  return dict[key] ?? en[key];
}
