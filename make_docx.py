from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Title
title = doc.add_heading('Sweety – Glucose Tracker', 0)
sub = doc.add_paragraph('Demo Video Recording Script — Step-by-Step User Guide')
sub.runs[0].italic = True
sub.runs[0].font.size = Pt(13)
sub.runs[0].font.color.rgb = RGBColor(0x25, 0x98, 0x80)

doc.add_paragraph(
    'This document lists the exact steps to perform while recording the demo video, '
    'in order: Admin login → create users → assign doctor → Doctor portal → Patient portal.'
)

# Demo credentials table
doc.add_heading('Demo Login Credentials', level=1)
table = doc.add_table(rows=5, cols=3)
table.style = 'Light Grid Accent 1'
hdr = table.rows[0].cells
hdr[0].text, hdr[1].text, hdr[2].text = 'Role', 'Email', 'Password'
creds = [
    ('Patient', 'demo@sweety.app', 'SweetyDemo123!'),
    ('Patient', 'priya@sweety.app', 'PriyaDemo123!'),
    ('Doctor', 'doctor@sweety.app', 'SweetyDoctor123!'),
    ('Admin', 'admin@sweety.app', 'SweetyAdmin123!'),
]
for i, (role, email, pwd) in enumerate(creds, start=1):
    row = table.rows[i].cells
    row[0].text, row[1].text, row[2].text = role, email, pwd

doc.add_paragraph(
    'App URLs — Frontend: http://localhost:5173   |   API health: http://localhost:5000/api/health'
).runs[0].italic = True

doc.add_page_break()

# Helper for sections
def section(num, name, steps, tips=None):
    doc.add_heading(f'{num}. {name}', level=1)
    for i, s in enumerate(steps, 1):
        p = doc.add_paragraph(style='List Number')
        p.add_run(s)
    if tips:
        doc.add_heading('Tips while recording', level=3)
        for t in tips:
            doc.add_paragraph(t, style='List Bullet')
    doc.add_paragraph()

# ---------------- PART 1: ADMIN ----------------
section('PART A', 'Admin Portal — Login & User Management', [
    'Open http://localhost:5173 in the browser.',
    'On the login screen, sign in as Admin: admin@sweety.app / SweetyAdmin123!',
    'Show the Admin panel: sidebar with "Users" and "Activity log".',
    'Click the "Patients" tab — show the patient list with assigned doctors.',
    'Click "Add patient" — create a new patient (e.g. name "Demo Patient", any email, password 8+ chars).',
    'Click "Doctors" tab — show doctor list (Dr. Ananya Rao, Endocrinology).',
    'Add a new doctor if desired (name, email, password, specialization).',
    'Back on "Patients" tab, use the "Assigned doctor" dropdown on a patient row to assign/reassign Dr. Ananya Rao — show it updates instantly.',
    'Open the "Activity log" tab — show recorded events: logins, user creation, assignments (newest first).',
    'Log out using the icon beside the profile name.',
], tips=[
    'Pause ~2 seconds on each screen so viewers can read it.',
    'Mention that every admin action is written to the activity log.',
])

# ---------------- PART 2: DOCTOR ----------------
section('PART B', 'Doctor Portal — Reviewing Patient Reports', [
    'Log in as Doctor: doctor@sweety.app / SweetyDoctor123!',
    'Show the Doctor workspace: "ASSIGNED PATIENTS" list in the sidebar.',
    'Click a patient (e.g. Sweety Demo) — show the Patient overview card: name, email, member since, assigned doctor + specialization.',
    'Show the metric cards: readings count, average, highest, lowest for the selected date.',
    'Demonstrate the date picker in the section header — pick a different date and show data updates.',
    'Show the three summary cards — Daily report, Month to date, Monthly report — each with its own working date/month picker. Change one to show customized data.',
    'Show "Readings on <date>" table (per-slot glucose values) and "Recent readings" table.',
    'Hover over cards/buttons to show the glossy hover effects.',
    'Log out.',
], tips=[
    'Emphasize that doctors only see patients assigned to them.',
    'Point out the activity log records "patient report viewed" events.',
])

# ---------------- PART 3: PATIENT ----------------
section('PART C', 'Patient Portal — Logging Readings & Profile', [
    'Log in as Patient: demo@sweety.app / SweetyDemo123!',
    'Show the Overview tab: greeting, metric cards (today\'s readings, average, highest, lowest).',
    'Click "Add a reading" — fill date (today), choose a time slot, enter a glucose value (e.g. 110 mg/dL), save.',
    'Show the "Daily breakdown" panel update with the new entry; edit and delete a reading using the pencil/trash icons — show the styled delete confirmation modal (not a browser popup).',
    'Show "Reading trends" chart and the three report summary cards.',
    'Open "My readings" tab — show the paginated table (20 per page) with page controls.',
    'Click the profile area beside the logout icon — show the My Profile modal: name, email, member since, assigned doctor.',
    'Log out — mention the logout is recorded in the activity log.',
], tips=[
    'If a slot is locked (before its opening time), show the disabled option and hint — demonstrates the time-slot rules.',
    'Mention email notifications: missed-slot reminders to patients and out-of-range alerts to doctors.',
])

# ---------------- PART 4: CLOSING ----------------
doc.add_heading('PART D — Closing (30–45 seconds)', level=1)
for s in [
    'Quick recap montage: admin creating users → doctor reviewing reports → patient logging readings.',
    'Show the landing/login screen one last time.',
    'End card: "Sweety – Small steps. Healthier days."',
]:
    doc.add_paragraph(s, style='List Number')

doc.add_paragraph()
doc.add_heading('Recording Checklist', level=1)
for s in [
    'Start screen recording at 1080p before opening the browser.',
    'Close notifications/pop-ups; use a clean browser window.',
    'Keep mouse movements slow and deliberate.',
    'Total target length: 2–3 minutes.',
    'Have the three logins ready (Admin, Doctor, Patient).',
]:
    doc.add_paragraph(s, style='List Bullet')

out = r'C:\Users\user\Downloads\Sweety_Glucose_Tracker_Starter\sweety-glucose-tracker\Demo_Video_Script.docx'
doc.save(out)
print('saved:', out)
