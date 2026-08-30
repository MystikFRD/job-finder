function getMatchConfig() {
  const fetchNode = $('Fetch User Config').first()?.json;
  if (fetchNode?.config) return fetchNode.config;
  const legacy = ($('Get Match Config').first()?.json ?? $('Get Search Config').first()?.json);
  return legacy?.config ?? legacy ?? {};
}

const rawCfg = getMatchConfig();
const profile = {
  skills: Array.isArray(rawCfg.match_skills) ? rawCfg.match_skills : [],
  preferredLocations: Array.isArray(rawCfg.preferred_locations) ? rawCfg.preferred_locations : [],
  languages: Array.isArray(rawCfg.profile_languages) ? rawCfg.profile_languages : [],
  wantsWorkingStudent: rawCfg.wants_working_student !== false
};

const job = $json.output ?? $json;

// ========================================
// HELPER
// ========================================

const norm = value =>
  String(value ?? "")
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();


const arrayNorm = arr =>
  Array.isArray(arr) ? arr.map(norm) : [];


const escapeRegex = value =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// Wichtig:
// Nicht mehr einfach text.includes("ai").
//
// "ai" matched jetzt:
// "AI Engineer" ✅
//
// aber NICHT:
// "maintenance" ❌
// "email" ❌
// "available" ❌

function containsTerm(text, term) {

  const normalizedText = norm(text);
  const normalizedTerm = norm(term);

  if (!normalizedTerm) {
    return false;
  }

  const escaped =
    escapeRegex(normalizedTerm);

  const regex =
    new RegExp(
      `(^|[^a-z0-9])${escaped}($|[^a-z0-9])`,
      "i"
    );

  return regex.test(normalizedText);
}


function containsAny(text, terms) {

  return terms.some(term =>
    containsTerm(text, term)
  );

}


// ========================================
// TECHNOLOGY MATCHING
// ========================================

const techAliases = {

  python: [
    "python"
  ],

  pytorch: [
    "pytorch",
    "py torch"
  ],

  git: [
    "git",
    "github",
    "gitlab"
  ],

  react: [
    "react",
    "reactjs",
    "react.js"
  ],

  javascript: [
    "javascript",
    "js",
    "ecmascript"
  ]

};


function matchesTechnology(
  profileSkill,
  jobTechnology
) {

  const skill =
    norm(profileSkill);

  const tech =
    norm(jobTechnology);

  const aliases =
    techAliases[skill] ?? [skill];


  return aliases.some(alias => {

    const normalizedAlias =
      norm(alias);

    // Exakter Match
    if (tech === normalizedAlias) {
      return true;
    }

    // Längere Begriffe dürfen enthalten sein
    // z.B. "Python 3"
    if (
      normalizedAlias.length >= 4 &&
      containsTerm(
        tech,
        normalizedAlias
      )
    ) {
      return true;
    }

    return false;
  });

}


// ========================================
// JOB TEXT
// ========================================

const searchableJobText = [

  job.job_title,
  job.job_description,

  ...(job.tasks || []),
  ...(job.required_requirements || []),
  ...(job.preferred_requirements || []),
  ...(job.required_technologies || []),
  ...(job.preferred_technologies || [])

].join(" ");


// ========================================
// TECHNISCHE INTERESSEN
//
// Kategorien statt einzelne Wörter,
// damit z.B.
//
// React + JavaScript + Frontend
//
// nicht künstlich als drei komplett
// unabhängige Interessen gewertet werden.
// ========================================

const interestCategories = {

  "AI / ML": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "generative ai",
    "ai engineering",
    "ai engineer",
    "ai agents",
    "ai agent",
    "llm",
    "pytorch"
  ],

  "Python": [
    "python",
    "django",
    "flask",
    "fastapi"
  ],

  "Software Development": [
    "software development",
    "software engineering",
    "software developer",
    "softwareentwickler",
    "softwareentwicklung",
    "programming",
    "programmierung"
  ],

  "Frontend": [
    "frontend",
    "front-end",
    "react",
    "javascript",
    "typescript"
  ],

  "Backend": [
    "backend",
    "back-end",
    "api",
    "node.js",
    "nodejs",
    "django",
    "flask",
    "fastapi"
  ],

  "Fullstack": [
    "fullstack",
    "full-stack",
    "full stack"
  ],

  "Automation / QA": [
    "automation",
    "automatisierung",
    "test automation",
    "qa automation",
    "quality assurance",
    "software testing"
  ]

};


// ========================================
// SCORE
// ========================================

let score = 0;

const positives = [];
const warnings = [];
const missingSkills = [];

if (job.analysis_status === 'fetch_failed') {
  warnings.push('Job page could not be fetched; score based on limited metadata');
}

if (job.analysis_status === 'extraction_failed') {
  warnings.push('Information extraction failed; score based on limited metadata');
}



// ========================================
// 1. WERKSTUDENT / STUDENT FIT
// MAX 20
// ========================================

const employmentType =
  norm(job.employment_type);

const title =
  norm(job.job_title);


const isWorkingStudentRole =

  containsTerm(
    title,
    "werkstudent"
  ) ||

  containsTerm(
    title,
    "werkstudentin"
  ) ||

  containsTerm(
    title,
    "working student"
  ) ||

  containsTerm(
    title,
    "student assistant"
  ) ||

  containsTerm(
    title,
    "student employee"
  ) ||

  containsTerm(
    employmentType,
    "werkstudent"
  ) ||

  containsTerm(
    employmentType,
    "working student"
  ) ||

  containsTerm(
    employmentType,
    "student assistant"
  ) ||

  containsTerm(
    employmentType,
    "student employee"
  );


if (isWorkingStudentRole) {

  score += 15;

  positives.push(
    "Working student position"
  );

}


if (job.student_required === true) {

  score += 5;

  positives.push(
    "Position explicitly targets students"
  );

}


// ========================================
// 2. JOB CONTENT / INTEREST MATCH
// MAX 25
// ========================================

const matchedAreas = [];


for (
  const [category, terms]
  of Object.entries(interestCategories)
) {

  if (
    containsAny(
      searchableJobText,
      terms
    )
  ) {

    matchedAreas.push(
      category
    );

  }

}


// 5 Punkte pro Kategorie
// maximal 25

const interestScore =
  Math.min(
    matchedAreas.length * 5,
    25
  );


score += interestScore;


if (matchedAreas.length > 0) {

  positives.push(
    "Relevant areas: " +
    matchedAreas.join(", ")
  );

}


// ========================================
// 3. TECHNOLOGY MATCH
// MAX 25
// ========================================

const requiredTech =
  job.required_technologies || [];

const preferredTech =
  job.preferred_technologies || [];


const matchedRequired = [];
const matchedPreferred = [];


for (const skill of profile.skills) {

  if (
    requiredTech.some(jobSkill =>
      matchesTechnology(
        skill,
        jobSkill
      )
    )
  ) {

    matchedRequired.push(
      norm(skill)
    );

  }


  if (
    preferredTech.some(jobSkill =>
      matchesTechnology(
        skill,
        jobSkill
      )
    )
  ) {

    matchedPreferred.push(
      norm(skill)
    );

  }

}


// Required Match = 10
// Preferred Match = 5
// maximal 25

const techScore =
  Math.min(

    matchedRequired.length * 10 +
    matchedPreferred.length * 5,

    25

  );


score += techScore;


if (matchedRequired.length > 0) {

  positives.push(
    "Required technologies matched: " +
    matchedRequired.join(", ")
  );

}


if (matchedPreferred.length > 0) {

  positives.push(
    "Preferred technologies matched: " +
    matchedPreferred.join(", ")
  );

}


// ========================================
// NICHT GEMATCHTE TECHNOLOGIEN
//
// KEIN Punkteabzug.
// Nur Information.
// ========================================

for (const tech of requiredTech) {

  const known =
    profile.skills.some(skill =>
      matchesTechnology(
        skill,
        tech
      )
    );


  if (!known) {

    missingSkills.push(
      tech
    );

  }

}


// ========================================
// 4. DEGREE FIT
// MAX 10
// ========================================

const degreeFields =
  arrayNorm(job.degree_fields);


const degreeText =
  degreeFields.join(" ");


const degreeMatches =

  containsAny(
    degreeText,
    [
      "computer science",
      "informatik",
      "business informatics",
      "wirtschaftsinformatik",
      "software engineering",
      "information technology",
      "it focus",
      "related field"
    ]
  );


if (degreeMatches) {

  score += 10;

  positives.push(
    "Degree field matches"
  );

}


// ========================================
// 5. LANGUAGES
// MAX 5
// ========================================

const requiredLanguages =
  arrayNorm(
    job.required_languages
  );


const languageMatch =
  requiredLanguages.filter(language =>
    profile.languages.some(own =>
      containsTerm(
        language,
        own
      )
    )
  );


if (
  requiredLanguages.length === 0 ||
  languageMatch.length ===
    requiredLanguages.length
) {

  score += 5;


  if (
    requiredLanguages.length > 0
  ) {

    positives.push(
      "Language requirements match"
    );

  }

}


// ========================================
// 6. LOCATION
// MAX 15
// ========================================

const location =
  norm(job.location);

const remoteOption =
  norm(job.remote_option);


const isPreferredLocation =
  profile.preferredLocations.some(place =>
    containsTerm(
      location,
      place
    )
  );


if (isPreferredLocation) {

  score += 15;

  positives.push(
    "Preferred location"
  );

}

else if (
  remoteOption === "remote"
) {

  // Location filter sollte vorher bereits
  // sicherstellen, dass dies Deutschland ist.

  score += 15;

  positives.push(
    "Remote position"
  );

}

else if (
  remoteOption === "hybrid"
) {

  score += 7;

  positives.push(
    "Hybrid work available"
  );

}

else if (
  job.home_office_available === true
) {

  score += 4;

  positives.push(
    "Home office available"
  );

}


// ========================================
// PENALTIES
// ========================================


// ----------------------------------------
// Berufserfahrung
// ----------------------------------------

const experienceText =
  norm(job.required_experience);


const clearlyProfessionalExperience =

  /[1-9]\+?\s*(year|years|jahr|jahre)/i
    .test(experienceText)

  ||

  experienceText.includes(
    "professional experience"
  )

  ||

  experienceText.includes(
    "professional work experience"
  )

  ||

  experienceText.includes(
    "berufserfahrung"
  );


if (
  job.previous_work_experience_required === true &&
  clearlyProfessionalExperience
) {

  score -= 10;

  warnings.push(
    "Professional work experience is required"
  );

}


// ========================================
// TECHNOLOGIEN
// ========================================

if (missingSkills.length > 0) {

  warnings.push(
    "Listed required technologies not matched: " +
    missingSkills.join(", ")
  );

}


// ========================================
// KEINE WERKSTUDENTENSTELLE
// ========================================

if (
  profile.wantsWorkingStudent &&
  !isWorkingStudentRole
) {

  score -= 20;

  warnings.push(
    "Position may not be a working student role"
  );

}


// ========================================
// TECHNICAL RELEVANCE GATE
//
// Ganz wichtig:
//
// Eine Customer-Service-/Marketing-/
// sonstige nichttechnische Stelle kann
// dadurch niemals ein guter Match werden.
// ========================================

const hasTechnicalRelevance =

  matchedAreas.length > 0 ||

  matchedRequired.length > 0 ||

  matchedPreferred.length > 0;


if (!hasTechnicalRelevance) {

  score = Math.min(
    score,
    49
  );

  warnings.push(
    "No clear technical relevance detected"
  );

}


// ========================================
// WORKING STUDENT GATE
//
// Falls es gar keine Studentenstelle ist,
// darf sie niemals Good/Excellent Match
// werden.
// ========================================

if (
  profile.wantsWorkingStudent &&
  !isWorkingStudentRole
) {

  score = Math.min(
    score,
    49
  );

}



if (job.analysis_status === 'fetch_failed' || job.analysis_status === 'extraction_failed') {
  score = Math.min(score, 59);
}

// ========================================
// SCORE 0 - 100
// ========================================

score = Math.round(

  Math.max(
    0,
    Math.min(
      100,
      score
    )
  )

);


// ========================================
// EMPFEHLUNG
// ========================================

let recommendation;


if (score >= 85) {

  recommendation =
    "🔥 Excellent Match - Apply";

}

else if (score >= 70) {

  recommendation =
    "✅ Good Match - Apply";

}

else if (score >= 55) {

  recommendation =
    "🟡 Possible Match - Review";

}

else {

  recommendation =
    "❌ Weak Match";

}


// ========================================
// OUTPUT
// ========================================

return {

  ...job,

  match: {

    score,
    recommendation,

    matched_required_technologies:
      matchedRequired,

    matched_preferred_technologies:
      matchedPreferred,

    // Feldname bleibt gleich,
    // damit andere Nodes nicht kaputtgehen.
    missing_required_technologies:
      missingSkills,

    matched_technical_areas:
      matchedAreas,

    positives,
    warnings

  }

};