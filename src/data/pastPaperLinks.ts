/**
 * Past paper links keyed by subject name (matches Subject.name).
 * All URLs point to the official exam board past-papers page for that subject —
 * stable, freely accessible, no IP issues.
 *
 * To add more subjects: add an entry here with the subject name as the key.
 */
export const PAST_PAPER_LINKS: Record<string, string> = {
  // ── Edexcel GCSE ──────────────────────────────────────────────────────────────
  'Edexcel Math':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel English':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/english-language-2015.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel Physics':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/physics-2016.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel Chemistry':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/chemistry-2016.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel Biology':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/biology-2016.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel French':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/french-2016.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',
  'Edexcel Business':
    'https://qualifications.pearson.com/en/qualifications/edexcel-gcses/business-2017.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FPast-papers-and-mark-schemes',

  // ── AQA GCSE ─────────────────────────────────────────────────────────────────
  'AQA Drama':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8261&subject=Drama&year=&component=',
  'AQA Math':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8300&subject=Mathematics&year=&component=',
  'AQA English Language':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8700&subject=English+Language&year=&component=',
  'AQA English Literature':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8702&subject=English+Literature&year=&component=',
  'AQA Physics':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8463&subject=Physics&year=&component=',
  'AQA Chemistry':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8462&subject=Chemistry&year=&component=',
  'AQA Biology':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8461&subject=Biology&year=&component=',
  'AQA Combined Science':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8464&subject=Combined+Science&year=&component=',
  'AQA French':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8652&subject=French&year=&component=',
  'AQA Spanish':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8698&subject=Spanish&year=&component=',
  'AQA German':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8668&subject=German&year=&component=',
  'AQA History':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8145&subject=History&year=&component=',
  'AQA Geography':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8035&subject=Geography&year=&component=',
  'AQA Computer Science':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8525&subject=Computer+Science&year=&component=',
  'AQA Business':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8132&subject=Business&year=&component=',
  'AQA Religious Studies':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8062&subject=Religious+Studies&year=&component=',
  'AQA Art and Design':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=8201&subject=Art+and+Design&year=&component=',

  // ── OCR GCSE ─────────────────────────────────────────────────────────────────
  'OCR Math':
    'https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/',
  'OCR Physics':
    'https://www.ocr.org.uk/qualifications/gcse/physics-gateway-science-suite-j249-from-2016/assessment/',
  'OCR Chemistry':
    'https://www.ocr.org.uk/qualifications/gcse/chemistry-gateway-science-suite-j248-from-2016/assessment/',
  'OCR Biology':
    'https://www.ocr.org.uk/qualifications/gcse/biology-gateway-science-suite-j247-from-2016/assessment/',
  'OCR Computer Science':
    'https://www.ocr.org.uk/qualifications/gcse/computer-science-j277-from-2020/assessment/',
  'OCR History':
    'https://www.ocr.org.uk/qualifications/gcse/history-b-schools-history-project-j411-from-2016/assessment/',
  'OCR Geography':
    'https://www.ocr.org.uk/qualifications/gcse/geography-b-geography-for-enquiring-minds-j384-from-2016/assessment/',
  'OCR English Language':
    'https://www.ocr.org.uk/qualifications/gcse/english-language-j351-from-2015/assessment/',
  'OCR English Literature':
    'https://www.ocr.org.uk/qualifications/gcse/english-literature-j352-from-2015/assessment/',

  // ── A-Level ───────────────────────────────────────────────────────────────────
  'Math':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7357&subject=Mathematics&year=&component=',
  'Further Math':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7367&subject=Further+Mathematics&year=&component=',
  'Physics':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7408&subject=Physics&year=&component=',
  'Chemistry':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7405&subject=Chemistry&year=&component=',
  'Biology':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7402&subject=Biology&year=&component=',
  'Computer Science':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7517&subject=Computer+Science&year=&component=',
  'Economics':
    'https://www.aqa.org.uk/find-past-papers-and-mark-schemes?qualificationCode=7136&subject=Economics&year=&component=',
};
