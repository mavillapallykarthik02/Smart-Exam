from io import BytesIO
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.dml.color import RGBColor
from pptx.chart.data import ChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pathlib import Path
from PIL import Image


OUT = Path(r"C:\Users\harik\OneDrive\Desktop\SmartExam_Project_Reference_Approval_Hierarchy.pptx")
ROOT = Path(r"C:\Users\harik\OneDrive\Desktop\Main_Online_Exam_Project\SmartExam")

NAVY = RGBColor(11, 37, 69)
NAVY2 = RGBColor(19, 64, 116)
CYAN = RGBColor(38, 198, 218)
BLUE = RGBColor(0, 122, 204)
ORANGE = RGBColor(255, 166, 77)
WHITE = RGBColor(255, 255, 255)
INK = RGBColor(31, 45, 61)
MUTED = RGBColor(108, 125, 145)
LIGHT = RGBColor(248, 250, 252)
GREEN = RGBColor(52, 182, 126)
RED = RGBColor(235, 92, 92)
GOLD = RGBColor(247, 191, 66)


prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)


def rect(slide, x, y, w, h, fill=WHITE, radius=True, line=None):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line if line else fill
    return shape


def text(slide, x, y, w, h, value, size=18, color=INK, bold=False,
         align=PP_ALIGN.LEFT, font="Aptos", valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.text = str(value)
    p.alignment = align
    p.font.name = font
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    return box


def rich_text(slide, x, y, w, h, runs, size=18, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    for item in runs:
        r = p.add_run()
        r.text = item["text"]
        r.font.name = "Aptos"
        r.font.size = Pt(item.get("size", size))
        r.font.bold = item.get("bold", False)
        r.font.color.rgb = item.get("color", INK)
    return box


def base_slide(title, section=None, dark=False):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = NAVY if dark else LIGHT
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = bg
    if section:
        text(slide, 0.55, 0.28, 2.3, 0.28, section.upper(), 9,
             CYAN if dark else BLUE, True)
    if title:
        text(slide, 0.55, 0.62, 12.2, 0.62, title, 27,
             WHITE if dark else NAVY, True)
        rect(slide, 0.55, 1.24, 0.75, 0.055, CYAN, False)
    text(slide, 12.05, 7.14, 0.72, 0.18, f"{len(prs.slides):02d}",
         8, (RGBColor(180, 195, 210) if dark else MUTED), True, PP_ALIGN.RIGHT)
    return slide


def bullet_list(slide, x, y, w, items, size=16, color=INK, accent=CYAN, gap=0.58):
    for i, item in enumerate(items):
        yy = y + i * gap
        circ = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(yy + 0.09),
                                      Inches(0.10), Inches(0.10))
        circ.fill.solid()
        circ.fill.fore_color.rgb = accent
        circ.line.color.rgb = accent
        text(slide, x + 0.22, yy, w - 0.22, gap - 0.03, item, size, color)


def pill(slide, x, y, w, label, fill=BLUE, color=WHITE):
    rect(slide, x, y, w, 0.34, fill, True)
    text(slide, x, y + 0.01, w, 0.30, label, 10, color, True,
         PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)


def card(slide, x, y, w, h, title, body, accent=BLUE, number=None):
    rect(slide, x, y, w, h, WHITE, True)
    rect(slide, x, y, 0.07, h, accent, False)
    if number:
        text(slide, x + 0.22, y + 0.18, 0.45, 0.36, number, 18, accent, True)
        text(slide, x + 0.72, y + 0.18, w - 0.92, 0.36, title, 15, NAVY, True)
    else:
        text(slide, x + 0.22, y + 0.18, w - 0.44, 0.36, title, 15, NAVY, True)
    text(slide, x + 0.22, y + 0.62, w - 0.44, h - 0.76, body, 12, MUTED)


def add_picture_fit(slide, image_path, x, y, w, h, crop=None):
    if not image_path.exists():
        raise FileNotFoundError(image_path)
    with Image.open(image_path) as source:
        image = source.convert("RGB")
        if crop:
            left, top, right, bottom = crop
            image = image.crop((
                left,
                top,
                min(right, image.width),
                min(bottom, image.height)
            ))
        image_width, image_height = image.size
        image_stream = BytesIO()
        image.save(image_stream, format="PNG")
    image_stream.seek(0)
    scale = min(w / image_width, h / image_height)
    fitted_width = image_width * scale
    fitted_height = image_height * scale
    slide.shapes.add_picture(
        image_stream,
        Inches(x + (w - fitted_width) / 2),
        Inches(y + (h - fitted_height) / 2),
        width=Inches(fitted_width),
        height=Inches(fitted_height)
    )


def flow_node(slide, x, y, w, h, heading, body, accent=BLUE):
    rect(slide, x, y, w, h, WHITE, True, RGBColor(222, 231, 242))
    rect(slide, x, y, 0.08, h, accent, False)
    text(slide, x + 0.20, y + 0.20, w - 0.38, 0.48,
         heading, 12, NAVY, True, PP_ALIGN.CENTER)
    text(slide, x + 0.18, y + 0.78, w - 0.34, h - 0.94,
         body, 10, MUTED, False, PP_ALIGN.CENTER)


def flow_arrow(slide, x, y, color=BLUE, down=False):
    arrow = slide.shapes.add_shape(
        MSO_SHAPE.DOWN_ARROW if down else MSO_SHAPE.RIGHT_ARROW,
        Inches(x), Inches(y), Inches(0.30 if not down else 0.22),
        Inches(0.34 if not down else 0.24)
    )
    arrow.fill.solid()
    arrow.fill.fore_color.rgb = color
    arrow.line.color.rgb = color


def screenshot_panel(slide, x, y, w, h, title, caption, image_path,
                    accent=BLUE, crop=None):
    rect(slide, x, y, w, h, WHITE, True, RGBColor(222, 231, 242))
    rect(slide, x, y, 0.08, h, accent, False)
    text(slide, x + 0.22, y + 0.16, w - 0.44, 0.34, title, 14, NAVY, True)
    add_picture_fit(
        slide, image_path, x + 0.16, y + 0.58, w - 0.32, h - 1.20, crop
    )
    text(slide, x + 0.22, y + h - 0.52, w - 0.44, 0.38,
         caption, 10, MUTED)


def hierarchy_card(slide, y, number, title, description, fill):
    x = 2.10
    w = 9.12
    h = 0.72
    rect(slide, x, y, w, h, fill, True)
    badge = slide.shapes.add_shape(
        MSO_SHAPE.OVAL, Inches(x + 0.22), Inches(y + 0.13),
        Inches(0.46), Inches(0.46)
    )
    badge.fill.solid()
    badge.fill.fore_color.rgb = WHITE
    badge.line.color.rgb = WHITE
    text(slide, x + 0.22, y + 0.14, 0.46, 0.43, number,
         11, fill, True, PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    text(slide, x + 0.88, y + 0.09, w - 1.10, 0.28,
         title, 16, WHITE, True)
    text(slide, x + 0.88, y + 0.40, w - 1.10, 0.22,
         description, 10, RGBColor(226, 236, 246))


# 1. Title
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.background.fill.solid()
slide.background.fill.fore_color.rgb = NAVY
rect(slide, 8.95, 0, 4.38, 7.5, NAVY2, False)
rect(slide, 9.55, 0.95, 2.75, 2.75, WHITE, True)
logo = ROOT / "public" / "logo.png"
if logo.exists():
    slide.shapes.add_picture(str(logo), Inches(9.73), Inches(1.13),
                             width=Inches(2.39), height=Inches(2.39))
text(slide, 0.72, 0.62, 4.2, 0.28, "DIPLOMA CAPSTONE PROJECT PRESENTATION", 10, CYAN, True)
text(slide, 0.72, 1.38, 7.35, 1.18, "SmartExam", 42, WHITE, True)
text(slide, 0.72, 2.52, 7.8, 0.62, "Secure Online Examination & Academic Progress Platform", 21, RGBColor(198, 215, 232), False)
rect(slide, 0.72, 3.32, 1.05, 0.06, CYAN, False)
text(slide, 0.72, 3.72, 7.75, 0.72,
     "A secure, role-based full-stack platform for academic assessment,\nserver-authoritative exams, and controlled result publication",
     16, WHITE)
text(slide, 0.72, 5.72, 7.8, 0.26, "GOVERNMENT POLYTECHNIC MASAB TANK", 11, CYAN, True)
text(slide, 0.72, 6.15, 7.8, 0.48,
     "Diploma in Computer Science & Engineering  |  Academic Year 2025–26",
     12, RGBColor(198, 215, 232))
text(slide, 9.38, 4.35, 3.25, 0.36, "PROJECT TEAM", 10, CYAN, True, PP_ALIGN.CENTER)
team = "B. Emmanuel  •  Porika Hansika  •  A. Santhosh\nAbdul Mohid  •  Kanapuram Srinidhi\nM. Shashindhar Rao  •  T. Yashwanth  •  P. Kaveri"
text(slide, 9.15, 4.82, 3.7, 1.25, team, 11, WHITE, False, PP_ALIGN.CENTER)
text(slide, 9.15, 6.44, 3.7, 0.28, "Guide: T. Sailaja, M.Tech", 11, RGBColor(198, 215, 232), True, PP_ALIGN.CENTER)

# 2. Why SmartExam
slide = base_slide("The Challenge and the Opportunity", "01 • Introduction")
card(slide, 0.55, 1.65, 3.85, 4.85,
     "Traditional examination gaps",
     "• Manual question-paper distribution\n\n• Separate records for classes and marks\n\n• Delayed feedback and result publication\n\n• Difficult timing and submission traceability\n\n• Limited academic and role-level access control",
     RED)
card(slide, 4.73, 1.65, 3.85, 4.85,
     "A centralized solution",
     "• Unified academic and examination records\n\n• Role-specific dashboards\n\n• Server-enforced test windows\n\n• Persistent answers and attempts\n\n• Controlled evaluation and publication",
     BLUE)
card(slide, 8.91, 1.65, 3.85, 4.85,
     "What makes it reliable",
     "• JWT authentication and bcrypt passwords\n\n• MongoDB references and unique indexes\n\n• MCQ automation + teacher-led descriptive grading\n\n• Validated REST APIs\n\n• Derived progress from published results",
     GREEN)

# 3. Objectives
slide = base_slide("Project Objectives", "02 • Scope")
objectives = [
    ("1", "Role-based Access", "Separate workflows for students, teachers, branch administrators, and college administrators."),
    ("2", "Academic Mapping", "Connect branches, subjects, batches, study years, semesters, and teacher assignments."),
    ("3", "Exam Delivery", "Publish scheduled MCQ and descriptive tests with server-authoritative timing."),
    ("4", "Evaluation", "Automate objective scoring while preserving teacher authority over descriptive answers."),
    ("5", "Result Transparency", "Expose only published results and derive performance from real records."),
]
for i, (num, title, body) in enumerate(objectives):
    x = 0.55 + i * 2.50
    rect(slide, x, 1.65, 2.28, 4.55, WHITE, True)
    rect(slide, x, 1.65, 2.28, 0.10, [BLUE, CYAN, GREEN, ORANGE, GOLD][i], False)
    text(slide, x + 0.20, 1.93, 1.88, 0.40, num, 24, [BLUE, CYAN, GREEN, ORANGE, GOLD][i], True)
    text(slide, x + 0.20, 2.52, 1.88, 0.64, title, 15, NAVY, True)
    text(slide, x + 0.20, 3.38, 1.88, 2.22, body, 12, MUTED)

# 4. User Roles
slide = base_slide("Four Roles, One Controlled System", "03 • Users")
roles = [
    ("College Admin", "Institution, branches,\nstaff approval, incharges", NAVY2),
    ("Branch Admin", "Subjects, teacher requests,\nacademic assignments", BLUE),
    ("Teacher", "Tests, questions, evaluation,\nresult publication", ORANGE),
    ("Student", "Subjects, attempts, answers,\npublished results", GREEN),
]
for i, (role, duties, color) in enumerate(roles):
    x = 0.68 + i * 3.11
    rect(slide, x, 1.70, 2.82, 3.72, WHITE, True)
    rect(slide, x + 0.98, 2.10, 0.86, 0.86, color, True)
    text(slide, x + 0.98, 2.10, 0.86, 0.86, str(i + 1), 22, WHITE, True,
         PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    text(slide, x + 0.20, 3.34, 2.42, 0.48, role, 17, NAVY, True, PP_ALIGN.CENTER)
    text(slide, x + 0.25, 4.10, 2.32, 0.86, duties, 12, MUTED, False, PP_ALIGN.CENTER)
pill(slide, 4.75, 5.88, 3.84, "FRONTEND HIDES CONTROLS • BACKEND ENFORCES ACCESS", NAVY)

# 5. Approval hierarchy
slide = base_slide("Approval and Academic Control Hierarchy", "03 • Users & Governance")
hierarchy_card(
    slide, 1.52, "01", "College Administrator",
    "College-wide control • Branch management",
    NAVY2
)
flow_arrow(slide, 6.55, 2.26, ORANGE, down=True)
pill(slide, 4.52, 2.53, 4.30, "APPROVES BRANCH ADMINISTRATORS",
     RGBColor(255, 239, 224), RGBColor(156, 74, 20))
hierarchy_card(
    slide, 2.93, "02", "Branch Administrator",
    "Branch management • Student performance",
    BLUE
)
flow_arrow(slide, 6.55, 3.67, ORANGE, down=True)
pill(slide, 4.52, 3.94, 4.30, "APPROVES TEACHERS",
     RGBColor(255, 239, 224), RGBColor(156, 74, 20))
hierarchy_card(
    slide, 4.34, "03", "Teacher",
    "Subjects • Tests • Student management",
    GREEN
)
flow_arrow(slide, 6.55, 5.08, ORANGE, down=True)
pill(slide, 4.52, 5.35, 4.30, "APPROVES STUDENTS",
     RGBColor(255, 239, 224), RGBColor(156, 74, 20))
hierarchy_card(
    slide, 5.75, "04", "Student",
    "Examinations • Practice • Results • Progress",
    RGBColor(45, 50, 56)
)
text(slide, 0.70, 6.62, 11.95, 0.30,
     "Every approval is validated by the API and scoped to the role's institution, branch, or assigned class.",
     12, MUTED, True, PP_ALIGN.CENTER)

# 6. Architecture
slide = base_slide("Three-Tier Application Architecture", "04 • System Design")
columns = [
    ("PRESENTATION", "React 19 + Vite", "Pages • Router • Context\nAPI services • CSS themes", BLUE),
    ("APPLICATION", "Express REST API", "Routes • Controllers\nServices • Validators", CYAN),
    ("PERSISTENCE", "MongoDB + Mongoose", "Users • Tests • Attempts\nAnswers • Results", GREEN),
]
for i, (head, tech, body, color) in enumerate(columns):
    x = 0.62 + i * 4.20
    rect(slide, x, 1.72, 3.62, 3.65, WHITE, True)
    rect(slide, x, 1.72, 3.62, 0.66, color, True)
    text(slide, x, 1.86, 3.62, 0.28, head, 11, WHITE, True, PP_ALIGN.CENTER)
    text(slide, x + 0.25, 2.72, 3.12, 0.50, tech, 18, NAVY, True, PP_ALIGN.CENTER)
    text(slide, x + 0.25, 3.55, 3.12, 1.10, body, 13, MUTED, False, PP_ALIGN.CENTER)
    if i < 2:
        text(slide, x + 3.69, 3.10, 0.46, 0.35, "→", 24, ORANGE, True, PP_ALIGN.CENTER)
text(slide, 0.62, 5.85, 12.05, 0.44,
     "JSON over HTTP  •  JWT cookie session  •  Consistent success/error responses  •  Centralized API client",
     13, NAVY, True, PP_ALIGN.CENTER)

# 6. API data flow
slide = base_slide("Data Flow 1 — From User Action to Database", "04 • System Design")
api_flow = [
    ("User", "Student or teacher\nuses a protected\nportal page", BLUE),
    ("React app", "Route, page state,\ncontext, and UI\nactions", CYAN),
    ("API client", "Central service\nsends JSON requests\nwith session cookie", ORANGE),
    ("Express API", "Authentication,\nrole checks, and\nrequest validation", GREEN),
    ("Services", "Business rules,\ncohort access, and\nrecord assembly", BLUE),
    ("MongoDB", "Mongoose models\nread and persist\nacademic records", NAVY2),
]
for i, (heading, body, accent) in enumerate(api_flow):
    x = 0.55 + i * 2.08
    flow_node(slide, x, 2.05, 1.72, 2.05, heading, body, accent)
    if i < len(api_flow) - 1:
        flow_arrow(slide, x + 1.78, 2.88, ORANGE)
rect(slide, 0.78, 4.75, 11.78, 1.00, NAVY, True)
text(slide, 1.02, 4.98, 11.30, 0.52,
     "Responses return through the API client; centralized middleware formats errors and success payloads.",
     14, WHITE, True, PP_ALIGN.CENTER)

# 7. Approval and access data flow
slide = base_slide("Data Flow 2 — Registration to Approved Access", "04 • System Design")
approval_flow = [
    ("Register", "Student submits\nidentity, branch,\nbatch, and class", BLUE),
    ("Pending", "Account is stored\nwithout test or\nportal access", ORANGE),
    ("Class review", "Assigned class\nincharge approves\nor rejects request", CYAN),
    ("Access gate", "Status and role\nare checked during\nsign-in and APIs", GREEN),
    ("Student portal", "Approved student\nsees only assigned\nclass information", NAVY2),
]
for i, (heading, body, accent) in enumerate(approval_flow):
    x = 0.55 + i * 2.48
    flow_node(slide, x, 2.03, 2.08, 2.00, heading, body, accent)
    if i < len(approval_flow) - 1:
        flow_arrow(slide, x + 2.13, 2.82, ORANGE)
rect(slide, 2.04, 4.75, 9.26, 1.00, RGBColor(255, 239, 239), True)
text(slide, 2.28, 4.98, 8.78, 0.50,
     "Pending, rejected, or suspended accounts are denied sign-in; class access is scoped by branch, batch, year, and semester.",
     13, RED, True, PP_ALIGN.CENTER)

# 8. Examination data flow
slide = base_slide("Data Flow 3 — Test Attempt and Evaluation", "09 • Timed Attempts")
exam_flow = [
    ("Configure", "Teacher assigns\nsubject, cohort,\nquestions, and window", BLUE),
    ("Authorize", "API checks publish\nstatus, schedule, and\nclass placement", CYAN),
    ("Start attempt", "Backend stores\nstudent, start time,\nand deadline", GREEN),
    ("Save answers", "Answers attach to\nattempt + question;\nlate writes are blocked", ORANGE),
    ("Submit", "Student submits or\nexpiry worker locks\nthe attempt", RED),
    ("Evaluate", "MCQ auto-scores;\ndescriptive work is\nteacher-reviewed", NAVY2),
]
for i, (heading, body, accent) in enumerate(exam_flow):
    x = 0.55 + i * 2.08
    flow_node(slide, x, 2.03, 1.72, 2.10, heading, body, accent)
    if i < len(exam_flow) - 1:
        flow_arrow(slide, x + 1.78, 2.88, ORANGE)
rect(slide, 1.48, 4.82, 10.36, 0.90, NAVY, True)
text(slide, 1.72, 5.04, 9.88, 0.45,
     "The server owns exam deadlines; the browser countdown is only a display of the authoritative attempt expiry.",
     13, WHITE, True, PP_ALIGN.CENTER)

# 9. Results and progress data flow
slide = base_slide("Data Flow 4 — Results Become Progress Insights", "10 • Assessment")
flow_node(slide, 0.55, 1.82, 2.35, 1.55,
          "Submitted attempt", "Responses and timing\nare persisted", BLUE)
flow_arrow(slide, 2.98, 2.42, ORANGE)
flow_node(slide, 3.38, 1.82, 2.35, 1.55,
          "Evaluate", "Objective scoring or\nteacher grading", CYAN)
flow_arrow(slide, 5.81, 2.42, ORANGE)
flow_node(slide, 6.21, 1.82, 2.35, 1.55,
          "Publish result", "Score and pass status\nbecome student-visible", GREEN)
flow_arrow(slide, 8.64, 2.42, ORANGE)
flow_node(slide, 9.04, 1.82, 3.15, 1.55,
          "Persisted results", "Published records feed\nviews and metrics", NAVY2)
rect(slide, 1.10, 3.78, 11.12, 0.48, NAVY, True)
text(slide, 1.28, 3.86, 10.76, 0.28,
     "Role-aware read models and cohort-scoped reporting",
     12, WHITE, True, PP_ALIGN.CENTER)
for arrow_x in (2.48, 6.28, 10.08):
    flow_arrow(slide, arrow_x, 4.38, CYAN, down=True)
flow_node(slide, 0.85, 4.92, 3.68, 1.35,
          "Student progress", "Own history, completed tests, marks, and trends", BLUE)
flow_node(slide, 4.83, 4.92, 3.68, 1.35,
          "Teacher results", "Subject → test → every student in the exact class", ORANGE)
flow_node(slide, 8.80, 4.92, 3.68, 1.35,
          "Class insights", "Branch, year, and subject performance from persisted results", GREEN)
text(slide, 0.75, 6.38, 11.95, 0.32,
     "Unattempted students appear in the teacher's class roster; they are not counted as submitted results.",
     12, MUTED, True, PP_ALIGN.CENTER)

# 10. Tech Stack
slide = base_slide("Technology Stack", "05 • Implementation")
tech = [
    ("Frontend", "React 19\nVite\nReact Router\nContext API", BLUE),
    ("Backend", "Node.js\nExpress 5\nMongoose 8\nREST / JSON", CYAN),
    ("Database", "MongoDB\nUnique indexes\nReferences\nServer validation", GREEN),
    ("Security", "JWT\nbcryptjs\nHelmet\nCORS + rate limits", ORANGE),
]
for i, (title, body, color) in enumerate(tech):
    x = 0.62 + i * 3.13
    rect(slide, x, 1.70, 2.82, 4.35, WHITE, True)
    rect(slide, x + 0.20, 2.02, 0.52, 0.52, color, True)
    text(slide, x + 0.20, 2.02, 0.52, 0.52, str(i + 1), 16, WHITE, True,
         PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    text(slide, x + 0.20, 2.86, 2.42, 0.42, title, 17, NAVY, True)
    text(slide, x + 0.20, 3.55, 2.42, 1.80, body, 14, MUTED)
pill(slide, 4.78, 6.42, 3.78, "PLATFORM: WEB • RESPONSIVE • API-FIRST", NAVY)

# 7. Data model
slide = base_slide("Core Data Model", "06 • Database")
entities = [
    ("USER", BLUE), ("BRANCH", CYAN), ("SUBJECT", GREEN),
    ("ASSIGNMENT", ORANGE), ("TEST", GOLD), ("QUESTION", BLUE),
    ("ATTEMPT", CYAN), ("ANSWER", GREEN), ("RESULT", ORANGE),
]
positions = [(0.62,1.70),(4.80,1.70),(8.98,1.70),
             (0.62,3.46),(4.80,3.46),(8.98,3.46),
             (0.62,5.22),(4.80,5.22),(8.98,5.22)]
for i, ((name, color), (x, y)) in enumerate(zip(entities, positions)):
    rect(slide, x, y, 3.55, 1.20, WHITE, True)
    rect(slide, x, y, 0.12, 1.20, color, False)
    text(slide, x + 0.28, y + 0.21, 2.98, 0.32, name, 14, NAVY, True)
    subs = {
        "USER":"Identity • role • status",
        "BRANCH":"Institution • lifecycle",
        "SUBJECT":"Branch • publication",
        "ASSIGNMENT":"Teacher • batch • year • semester",
        "TEST":"Schedule • duration • status",
        "QUESTION":"Type • options • marks",
        "ATTEMPT":"Student • deadline • state",
        "ANSWER":"Response • awarded marks",
        "RESULT":"Score • percentage • publication",
    }
    text(slide, x + 0.28, y + 0.70, 3.05, 0.28, subs[name], 11, MUTED)

# 8. Academic setup
slide = base_slide("Academic Setup and Access Mapping", "07 • Branches & Subjects")
steps = [
    ("1", "Institution\ncreates branch", BLUE),
    ("2", "Branch admin\npublishes subject", CYAN),
    ("3", "Approve teacher\nfor institution", ORANGE),
    ("4", "Create cohort\nassignment", GREEN),
]
for i, (num, label, color) in enumerate(steps):
    x = 0.66 + i * 3.08
    rect(slide, x, 2.10, 2.58, 2.18, WHITE, True)
    rect(slide, x + 0.86, 1.72, 0.86, 0.86, color, True)
    text(slide, x + 0.86, 1.72, 0.86, 0.86, num, 20, WHITE, True,
         PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    text(slide, x + 0.24, 2.86, 2.10, 0.80, label, 15, NAVY, True, PP_ALIGN.CENTER)
    if i < 3:
        text(slide, x + 2.62, 2.74, 0.40, 0.40, "→", 21, MUTED, True, PP_ALIGN.CENTER)
rect(slide, 1.05, 5.08, 11.22, 1.12, NAVY, True)
text(slide, 1.30, 5.36, 10.72, 0.40,
     "A test is eligible only when branch + batch + study year + semester match the student's enrollment.",
     15, WHITE, True, PP_ALIGN.CENTER)

# 9. Test Management
slide = base_slide("Test and Question Management", "08 • Teacher Workspace")
card(slide, 0.55, 1.66, 3.80, 4.86,
     "Test configuration",
     "• Title, subject, branch, and cohort\n\n• Start/end time and duration\n\n• Total questions and marks\n\n• Passing percentage\n\n• DRAFT, PUBLISHED, or ARCHIVED",
     BLUE)
card(slide, 4.76, 1.66, 3.80, 4.86,
     "Question support",
     "• MCQ prompt and options\n\n• Correct answer held privately\n\n• Descriptive prompt and guidance\n\n• Marks and answer methods\n\n• Ordered, editable question positions",
     CYAN)
card(slide, 8.97, 1.66, 3.80, 4.86,
     "Publication safeguards",
     "• Only active teacher assignments\n\n• Eligible scheduled publication\n\n• Correct answer withheld from students\n\n• Archiving protects historical records\n\n• Controlled question updates",
     ORANGE)

# 10. Exam lifecycle
slide = base_slide("Server-Authoritative Examination Lifecycle", "09 • Timed Attempts")
phases = [
    ("Check", "Published?\nWindow?\nPlacement?", BLUE),
    ("Start", "Create attempt\nRecord start\nCalculate expiry", CYAN),
    ("Answer", "Persist response\nResume attempt\nRecord events", GREEN),
    ("Submit", "Manual or timeout\nLock answers\nCreate result", ORANGE),
]
for i, (title, body, color) in enumerate(phases):
    x = 0.60 + i * 3.10
    rect(slide, x, 1.96, 2.64, 3.65, WHITE, True)
    rect(slide, x + 0.92, 1.58, 0.80, 0.80, color, True)
    text(slide, x + 0.92, 1.58, 0.80, 0.80, str(i + 1), 18, WHITE, True,
         PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
    text(slide, x + 0.20, 2.75, 2.24, 0.42, title, 17, NAVY, True, PP_ALIGN.CENTER)
    text(slide, x + 0.30, 3.50, 2.04, 1.40, body, 13, MUTED, False, PP_ALIGN.CENTER)
    if i < 3:
        text(slide, x + 2.70, 3.22, 0.34, 0.40, "→", 21, ORANGE, True, PP_ALIGN.CENTER)
pill(slide, 4.18, 6.10, 4.96, "EXPIRY = MINIMUM OF DURATION DEADLINE & TEST END TIME", NAVY)

# 11. Evaluation
slide = base_slide("Evaluation and Result Publication", "10 • Assessment")
rect(slide, 0.58, 1.66, 5.80, 4.86, WHITE, True)
text(slide, 0.92, 1.98, 5.12, 0.42, "MCQ TEST", 17, BLUE, True)
mcq = [
    ("Submit", "Selected option"),
    ("Compare", "Stored correct answer"),
    ("Award", "Configured question marks"),
    ("Calculate", "Score • percentage • pass/fail"),
]
for i, (a, b) in enumerate(mcq):
    y = 2.78 + i * 0.82
    pill(slide, 0.92, y, 1.08, a, BLUE)
    text(slide, 2.22, y + 0.01, 3.52, 0.32, b, 13, MUTED)
rect(slide, 6.94, 1.66, 5.80, 4.86, WHITE, True)
text(slide, 7.28, 1.98, 5.12, 0.42, "DESCRIPTIVE TEST", 17, ORANGE, True)
descriptive = [
    ("Pending", "Submission creates evaluation state"),
    ("Review", "Teacher awards marks + feedback"),
    ("Complete", "All answer records evaluated"),
    ("Publish", "Student sees final result"),
]
for i, (a, b) in enumerate(descriptive):
    y = 2.78 + i * 0.82
    pill(slide, 7.28, y, 1.08, a, ORANGE)
    text(slide, 8.58, y + 0.01, 3.54, 0.32, b, 13, MUTED)

# 12. Security
slide = base_slide("Security and Integrity by Design", "11 • Security")
card(slide, 0.55, 1.66, 2.85, 4.72,
     "Identity",
     "• bcrypt password hashes\n\n• Signed JWT cookie\n\n• Account status checks\n\n• Password-reset token hash",
     BLUE)
card(slide, 3.67, 1.66, 2.85, 4.72,
     "Authorization",
     "• Role middleware\n\n• Resource ownership\n\n• Branch and cohort scope\n\n• Teacher assignment checks",
     CYAN)
card(slide, 6.79, 1.66, 2.85, 4.72,
     "API protection",
     "• Helmet security headers\n\n• CORS allow-list\n\n• Express rate limiting\n\n• Input validation",
     ORANGE)
card(slide, 9.91, 1.66, 2.85, 4.72,
     "Privacy",
     "• Field encryption\n\n• No password/JWT exposure\n\n• MCQ keys withheld\n\n• Public admin setup blocked",
     GREEN)

# 13. UI Experience
slide = base_slide("Role-Based User Experience", "12 • Frontend")
hero = ROOT / "presentation_assets" / "landing.png"
if hero.exists():
    add_picture_fit(slide, hero, 0.55, 1.70, 5.20, 4.40)
else:
    rect(slide, 0.55, 1.70, 5.20, 4.40, NAVY2, True)
    text(slide, 0.55, 3.20, 5.20, 0.50, "SMARTEXAM PLATFORM", 24, WHITE, True,
         PP_ALIGN.CENTER)
dashboards = [
    ("Student", "Dashboard • Subjects • Tests\nAttempt • Results • Progress"),
    ("Teacher", "Subjects • Tests • Questions\nAnswers • Results • Proctoring"),
    ("Administrators", "Branches • Staff approval\nSubjects • Assignments"),
]
for i, (title, body) in enumerate(dashboards):
    y = 1.72 + i * 1.62
    rect(slide, 6.12, y, 6.62, 1.30, WHITE, True)
    rect(slide, 6.12, y, 0.10, 1.30, [GREEN, ORANGE, BLUE][i], False)
    text(slide, 6.42, y + 0.20, 1.58, 0.32, title, 16, NAVY, True)
    text(slide, 8.04, y + 0.18, 4.38, 0.70, body, 12, MUTED)

# 18. Authentication screens
slide = base_slide("Live Screens — Student and Teacher Sign-In", "12 • Screenshots")
screenshot_panel(
    slide, 0.55, 1.55, 6.00, 5.30, "Student sign-in",
    "Students authenticate before seeing their assigned tests and published results.",
    ROOT / "presentation_assets" / "student_login.png", GREEN
)
screenshot_panel(
    slide, 6.78, 1.55, 6.00, 5.30, "Teacher sign-in",
    "Teacher ID, username, or email; account status is validated by the API.",
    ROOT / "presentation_assets" / "teacher_login_live.png",
    BLUE, (0, 0, 1281, 840)
)

# 19. Live teacher dashboard
slide = base_slide("Teacher Dashboard — Live Interface", "12 • Screenshots")
add_picture_fit(
    slide, ROOT / "presentation_assets" / "teacher_dashboard_live.png",
    0.55, 1.55, 8.20, 5.10, (0, 0, 1281, 850)
)
rect(slide, 9.02, 1.55, 3.72, 5.10, NAVY, True)
text(slide, 9.35, 1.95, 3.06, 0.42, "TEACHER WORKFLOW", 16, ORANGE, True)
bullet_list(slide, 9.35, 2.58, 2.96,
            ["Manage assigned students",
             "Approve class registrations",
             "Configure tests and questions",
             "Review and publish results",
             "Monitor proctoring events"],
            12, WHITE, ORANGE, 0.70)

# 20. Teacher workspace screenshots
slide = base_slide("Live Screens — Students and Approvals", "12 • Screenshots")
screenshot_panel(
    slide, 0.55, 1.55, 6.00, 5.30, "Class-based student management",
    "Roster groups display branch, cohort, enrollment status, attempts, and results.",
    ROOT / "presentation_assets" / "teacher_students_live.png",
    BLUE, (0, 0, 1281, 900)
)
screenshot_panel(
    slide, 6.78, 1.55, 6.00, 5.30, "Registration approvals",
    "Teachers review approval states for the classes assigned to them.",
    ROOT / "presentation_assets" / "teacher_approvals_live.png",
    ORANGE, (0, 0, 1281, 900)
)

# 21. Academic and test screenshots
slide = base_slide("Live Screens — Subjects and Tests", "12 • Screenshots")
screenshot_panel(
    slide, 0.55, 1.55, 6.00, 5.30, "Assigned subjects",
    "Subject access is tied to branch and an exact class assignment.",
    ROOT / "presentation_assets" / "teacher_subjects_live.png",
    CYAN, (0, 0, 1281, 514)
)
screenshot_panel(
    slide, 6.78, 1.55, 6.00, 5.30, "Test management",
    "Published tests retain their subject, branch, schedule, and question count.",
    ROOT / "presentation_assets" / "teacher_tests_live.png",
    BLUE, (0, 250, 1281, 1125)
)

# 22. Results screenshots
slide = base_slide("Live Screens — Results by Subject and Class", "12 • Screenshots")
screenshot_panel(
    slide, 0.55, 1.55, 6.00, 5.30, "Student results",
    "Teacher results are grouped by subject, then test, with a roster for each test's class.",
    ROOT / "presentation_assets" / "teacher_results_unattempted_crop.png",
    GREEN
)
screenshot_panel(
    slide, 6.78, 1.55, 6.00, 5.30, "Class performance context",
    "Each test roster includes students who have not attempted the test.",
    ROOT / "presentation_assets" / "teacher_students_live.png",
    ORANGE, (0, 0, 1281, 900)
)

# 23. Testing and delivery
slide = base_slide("Quality Assurance and Deployment", "13 • Validation")
rect(slide, 0.55, 1.66, 5.85, 4.86, WHITE, True)
text(slide, 0.88, 1.98, 5.18, 0.38, "Automated test areas", 17, NAVY, True)
tests = ["Branch administration", "Branch and subject access", "Teacher branch approval",
         "Descriptive exam flow", "Password recovery", "Email provider integration"]
bullet_list(slide, 0.90, 2.58, 5.05, tests, 13, MUTED, BLUE, 0.56)
rect(slide, 6.72, 1.66, 6.02, 4.86, WHITE, True)
text(slide, 7.05, 1.98, 5.34, 0.38, "Validation and deployment", 17, NAVY, True)
commands = [
    ("Frontend", "npm run build", "Production compile"),
    ("Quality", "npm run lint", "Static validation"),
    ("Backend", "npm --prefix backend test", "Integration tests"),
]
for i, (name, command, purpose) in enumerate(commands):
    y = 2.62 + i * 1.10
    pill(slide, 7.05, y, 1.18, name, [BLUE, ORANGE, GREEN][i])
    text(slide, 8.48, y - 0.02, 3.60, 0.30, command, 12, NAVY, True)
    text(slide, 8.48, y + 0.34, 3.60, 0.28, purpose, 11, MUTED)

# 24. Conclusion
slide = base_slide("Conclusion and Future Direction", "14 • Closing", dark=True)
rect(slide, 0.55, 1.66, 7.32, 4.82, NAVY2, True)
text(slide, 0.90, 2.02, 6.62, 0.42, "What SmartExam delivers", 18, CYAN, True)
bullet_list(slide, 0.92, 2.78, 6.42,
            ["One role-based platform for the complete academic assessment lifecycle",
             "Server-controlled timing and persistent examination records",
             "Automatic MCQ scoring and teacher-controlled descriptive evaluation",
             "Published results and progress derived from real data",
             "Security, privacy, validation, and historical-record safeguards"],
            14, WHITE, CYAN, 0.64)
rect(slide, 8.20, 1.66, 4.54, 4.82, RGBColor(23, 55, 92), True)
text(slide, 8.55, 2.02, 3.84, 0.42, "Future enhancements", 18, ORANGE, True)
bullet_list(slide, 8.55, 2.78, 3.70,
            ["Accessibility and low-bandwidth support",
             "Question-level analytics",
             "Structured grading rubrics",
             "Backup and monitoring automation",
             "Continued deployment hardening"],
            13, RGBColor(220, 232, 242), ORANGE, 0.64)
text(slide, 0.55, 6.78, 12.18, 0.26,
     "THANK YOU  •  QUESTIONS?", 15, WHITE, True, PP_ALIGN.CENTER)


for slide in prs.slides:
    for shape in slide.shapes:
        if hasattr(shape, "text_frame") and shape.text_frame:
            for p in shape.text_frame.paragraphs:
                for r in p.runs:
                    r.font.name = "Aptos"


OUT.parent.mkdir(parents=True, exist_ok=True)
prs.save(str(OUT))
print(str(OUT))
