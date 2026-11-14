// Reference notes for common tests. General education, written conservatively. Ranges differ between
// laboratories, methods, ages and sexes; the range printed on the person's own report is the one to use.
import type { LabTest } from './model';

export const LAB_TESTS: LabTest[] = [
  {
    id: 'a1c', name: 'Hemoglobin A1c', short: 'A1c', unit: '%', group: 'Blood sugar',
    about: 'Reflects average blood sugar over roughly the past two to three months.',
    notes: 'The American Diabetes Association uses below 5.7% as the usual range, 5.7–6.4% as the prediabetes range and 6.5% or higher (confirmed by repeat testing) as one criterion for diabetes. Some conditions, such as anemia or recent blood loss, can make A1c less reliable. Only your clinician can say what your result means for you.',
  },
  {
    id: 'glucose', name: 'Fasting glucose', short: 'Glucose', unit: 'mg/dL', group: 'Blood sugar',
    about: 'Blood sugar after at least 8 hours without food.',
    notes: 'The American Diabetes Association uses below 100 mg/dL as the usual fasting range and 100–125 mg/dL as the prediabetes range. Illness, stress, some medicines and not fasting can raise a single reading.',
  },
  {
    id: 'ldl', name: 'LDL cholesterol', short: 'LDL', unit: 'mg/dL', group: 'Lipids',
    about: 'Cholesterol carried in low-density lipoprotein, the main focus of most cholesterol guidelines.',
    notes: 'There is no single target for everyone. Your clinician weighs LDL together with age, blood pressure, diabetes, smoking and family history to decide what level suits you.',
  },
  {
    id: 'hdl', name: 'HDL cholesterol', short: 'HDL', unit: 'mg/dL', group: 'Lipids',
    about: 'Cholesterol carried in high-density lipoprotein.',
    notes: 'Lower HDL is generally associated with higher heart risk, but raising HDL with medicine has not been shown to lower risk. It is read as part of the whole lipid panel.',
  },
  {
    id: 'tg', name: 'Triglycerides', short: 'TG', unit: 'mg/dL', group: 'Lipids',
    about: 'A type of fat in the blood that rises after meals and with alcohol.',
    notes: 'Under 150 mg/dL (fasting) is the commonly used normal range. Recent meals, alcohol and some medicines affect the result.',
  },
  {
    id: 'tc', name: 'Total cholesterol', short: 'Chol', unit: 'mg/dL', group: 'Lipids',
    about: 'All the cholesterol in the blood sample.',
    notes: 'Usually interpreted together with LDL and HDL rather than on its own.',
  },
  {
    id: 'vitd', name: 'Vitamin D, 25-hydroxy', short: 'Vit D', unit: 'ng/mL', group: 'Vitamins and minerals',
    about: 'The main circulating form of vitamin D, used to judge vitamin D status.',
    notes: 'Expert groups disagree about the ideal level. The National Academy of Medicine considered 20 ng/mL adequate for bone health in most people; some labs flag results below 30 ng/mL. Very high levels can be harmful, so supplements are worth discussing with your clinician.',
  },
  {
    id: 'ferritin', name: 'Ferritin', short: 'Ferritin', unit: 'ng/mL', group: 'Vitamins and minerals',
    about: 'A protein that reflects the body’s iron stores.',
    notes: 'Ranges vary by lab and by sex. Ferritin also rises with inflammation or infection, so a normal value does not always rule out low iron. Your clinician may look at other iron tests alongside it.',
  },
  {
    id: 'hgb', name: 'Hemoglobin', short: 'Hgb', unit: 'g/dL', group: 'Blood count',
    about: 'The oxygen-carrying protein in red blood cells, part of a complete blood count.',
    notes: 'Ranges differ for men and women and between labs. Altitude, hydration and smoking can shift results.',
  },
  {
    id: 'tsh', name: 'Thyroid stimulating hormone', short: 'TSH', unit: 'mIU/L', group: 'Hormones',
    about: 'A pituitary hormone that signals the thyroid; the usual first test of thyroid function.',
    notes: 'Many labs use a range of roughly 0.4–4.0 mIU/L, but it varies by lab, age and pregnancy. Biotin supplements can interfere with some thyroid tests; tell the lab if you take them.',
  },
  {
    id: 'testo', name: 'Testosterone, total', short: 'Testosterone', unit: 'ng/dL', group: 'Hormones',
    about: 'Total testosterone in the blood. Levels are highest in the morning.',
    notes: 'For men, the American Urological Association uses a total testosterone below 300 ng/dL, measured on two separate early-morning tests and together with symptoms, as the basis for a diagnosis of low testosterone. Ranges for women are much lower and differ by lab.',
  },
  {
    id: 'egfr', name: 'eGFR', short: 'eGFR', unit: 'mL/min/1.73m²', group: 'Kidney and liver',
    about: 'An estimate of how well the kidneys filter, calculated from creatinine (and sometimes cystatin C).',
    notes: 'Values of 60 or above are generally in the expected range. An eGFR below 60 that lasts three months or more is one of the criteria for chronic kidney disease. Muscle mass, hydration and high-protein meals can affect creatinine-based estimates.',
  },
  {
    id: 'alt', name: 'ALT (alanine aminotransferase)', short: 'ALT', unit: 'U/L', group: 'Kidney and liver',
    about: 'A liver enzyme that can rise when liver cells are irritated.',
    notes: 'Ranges vary by lab. Hard exercise in the days before the test, alcohol, some medicines and supplements can raise ALT.',
  },
  {
    id: 'crp', name: 'hs-CRP', short: 'hs-CRP', unit: 'mg/L', group: 'Inflammation',
    about: 'A sensitive marker of inflammation, sometimes used as part of heart-risk assessment.',
    notes: 'In heart-risk assessment, below 1 mg/L is usually described as lower, 1–3 as average and above 3 as higher. A cold, an injury or a hard workout can raise it for days, so it is not meaningful during illness.',
  },
];

export const labTest = (id: string) => LAB_TESTS.find((t) => t.id === id);
