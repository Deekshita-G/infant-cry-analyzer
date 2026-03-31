const IMAGE_MAP = {
  asphyxia: '/illustrations/result-medical.jpg',
  hungry: '/illustrations/result-hungry.jpg',
  sleepy: '/illustrations/result-sleepy.jpg',
  tired: '/illustrations/result-comfort.jpg',
  lonely: '/illustrations/result-comfort.jpg',
  discomfort: '/illustrations/result-comfort.jpg',
  belly: '/illustrations/result-comfort.jpg',
  general: '/illustrations/baby-real.jpg',
  uncertain: '/illustrations/baby-real.jpg',
  not_baby_cry: '/illustrations/baby-real.jpg',
  no_sound: '/illustrations/baby-real.jpg',
  error: '/illustrations/baby-real.jpg',
}

const LABELS = {
  asphyxia: 'Asphyxia',
  hungry: 'Hunger',
  sleepy: 'Sleepy',
  tired: 'Tired',
  lonely: 'Scared',
  discomfort: 'Discomfort',
  belly: 'Pain',
  general: 'General Cry',
}

const PRECAUTIONS = {
  asphyxia: ['Monitor breathing immediately', 'Keep the airway clear', 'Seek urgent medical help'],
  hungry: ['Feed the baby if due', 'Look for hunger cues', 'Burp gently after feeding'],
  sleepy: ['Lower noise and light', 'Rock or cuddle gently', 'Help the baby settle for sleep'],
  tired: ['Reduce stimulation', 'Hold the baby calmly', 'Try a quieter rest routine'],
  lonely: ['Comfort and hold the baby', 'Use a calm voice', 'Stay close and reassuring'],
  discomfort: ['Check diaper and clothing', 'Adjust temperature or position', 'Look for signs of irritation'],
  belly: ['Burp the baby gently', 'Hold the baby upright', 'Monitor for tummy discomfort'],
  general: ['Check feeding, diaper, and comfort', 'Soothe with gentle holding', 'Observe whether the cry settles'],
  uncertain: ['Record a clearer cry sample', 'Move closer to the infant', 'Reduce background noise'],
  not_baby_cry: ['Check whether the clip contains speech or noise', 'Try recording closer to the baby', 'Upload a cleaner sample'],
  no_sound: ['Check microphone access', 'Record a louder sample', 'Make sure audio was captured'],
  error: ['Try again with another file', 'Refresh the page if needed', 'Upload a short clean recording'],
}

function normalizeCryType(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key in LABELS) return key
  return null
}

export function interpretResult(data) {
  const classification = data.classification || 'Unknown'
  const status = String(data.status || '').toLowerCase()
  const conf = typeof data.confidence === 'number' ? data.confidence : 0
  const confidenceBand = String(data.confidence_band || '').toLowerCase()
  const cryTypeKey = normalizeCryType(data.cry_type || data.possible_cause)
  const audioType = String(data.audio_type || '').toLowerCase()
  const detectedSound = String(data.detected_sound || '').toLowerCase()

  let badge = 'Review'
  let bannerClass = 'ica-result-banner--muted'
  let badgeClass = 'ica-badge--slate'
  let subtitle = 'Please review the clip and try again if needed.'
  let predictionLabel = 'Unclear Audio'
  let causeLabel = cryTypeKey ? LABELS[cryTypeKey] : 'Need a clearer recording'
  let precautions = cryTypeKey ? (PRECAUTIONS[cryTypeKey] || PRECAUTIONS.general) : PRECAUTIONS.general
  let imageKey = cryTypeKey || 'general'

  if (status === 'asphyxia') {
    badge = 'Urgent'
    bannerClass = 'ica-result-banner--alert'
    badgeClass = 'ica-badge--red'
    predictionLabel = 'Asphyxia Detected'
    causeLabel = LABELS.asphyxia
    subtitle = 'Immediate medical attention is recommended.'
    precautions = PRECAUTIONS.asphyxia
    imageKey = 'asphyxia'
  } else if (status === 'baby_cry') {
    badge = confidenceBand === 'low' ? 'Low confidence' : 'Cry detected'
    bannerClass = 'ica-result-banner--safe'
    badgeClass = confidenceBand === 'low' ? 'ica-badge--amber' : 'ica-badge--teal'
    predictionLabel = 'Baby Seems Okay'
    causeLabel = cryTypeKey ? LABELS[cryTypeKey] : LABELS.general
    subtitle =
      confidenceBand === 'low'
        ? 'This result has lower certainty. Review the cause and confidence carefully.'
        : 'A likely infant cry cause was identified from the uploaded audio.'
    precautions = PRECAUTIONS[cryTypeKey || 'general'] || PRECAUTIONS.general
    imageKey = cryTypeKey || 'general'
  } else if (status === 'not_baby_cry' || audioType === 'human_voice' || audioType === 'other_sound') {
    badge = 'Audio review'
    bannerClass = 'ica-result-banner--warn'
    badgeClass = 'ica-badge--amber'
    predictionLabel = detectedSound === 'adult_voice' || audioType === 'human_voice' ? 'Human Voice Detected' : 'Other Sound'
    causeLabel =
      detectedSound === 'adult_voice' || audioType === 'human_voice'
        ? 'Human speech in recording'
        : 'Background or non-cry audio'
    subtitle = 'The uploaded clip does not appear to be a baby cry.'
    precautions = PRECAUTIONS.not_baby_cry
    imageKey = 'not_baby_cry'
  } else if (status === 'no_sound') {
    badge = 'No signal'
    predictionLabel = 'Unclear Audio'
    causeLabel = 'No significant sound detected'
    subtitle = 'The audio sample was too quiet or empty for analysis.'
    precautions = PRECAUTIONS.no_sound
    imageKey = 'no_sound'
  } else if (status === 'uncertain' || audioType === 'unclear_audio') {
    badge = 'Review needed'
    bannerClass = 'ica-result-banner--warn'
    badgeClass = 'ica-badge--amber'
    predictionLabel = 'Unclear Audio'
    causeLabel = 'Need a clearer recording'
    subtitle = 'The result was not strong enough to report a reliable cause.'
    precautions = PRECAUTIONS.uncertain
    imageKey = 'uncertain'
  } else if (String(classification).toLowerCase().includes('error')) {
    badge = 'Error'
    bannerClass = 'ica-result-banner--warn'
    badgeClass = 'ica-badge--amber'
    predictionLabel = 'Unclear Audio'
    causeLabel = 'Processing issue'
    subtitle = 'The analysis could not be completed for this sample.'
    precautions = PRECAUTIONS.error
    imageKey = 'error'
  }

  return {
    classification,
    status,
    badge,
    bannerClass,
    badgeClass,
    headline: 'Results',
    subtitle,
    predictionLabel,
    causeLabel,
    cryTypeKey,
    imageUrl: IMAGE_MAP[imageKey] || IMAGE_MAP.general,
    imageAlt: 'Realistic baby photo related to the result',
    conf,
    confLabel: `${(conf * 100).toFixed(1)}%`,
    confidenceValue: Math.max(0, Math.min(100, Math.round(conf * 100))),
    precautions,
    analyzedAt: data.analyzed_at,
  }
}

const HISTORY_KEY = 'ica_react_history_v1'
const LAST_RESULT_KEY = 'ica_react_last_result_v1'
const MAX = 40

export function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushHistory(entry) {
  const list = [entry, ...loadHistory()].slice(0, MAX)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

export function saveLastResult(result) {
  try {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result))
  } catch {
    // Ignore storage errors and keep the UI flowing.
  }
}

export function loadLastResult() {
  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
