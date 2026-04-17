#!/usr/bin/env python3
"""Generate a friendly, easy-to-read SEO audit PDF for Freeman Chiropractic."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.platypus.flowables import Flowable
import os

# Colors
DARK_BLUE = HexColor("#1a365d")
MID_BLUE = HexColor("#2b6cb0")
LIGHT_BLUE = HexColor("#ebf8ff")
ACCENT_GREEN = HexColor("#276749")
ACCENT_RED = HexColor("#c53030")
ACCENT_ORANGE = HexColor("#c05621")
GRAY_100 = HexColor("#f7fafc")
GRAY_200 = HexColor("#edf2f7")
GRAY_300 = HexColor("#e2e8f0")
GRAY_500 = HexColor("#a0aec0")
GRAY_600 = HexColor("#718096")
GRAY_700 = HexColor("#4a5568")
GRAY_800 = HexColor("#2d3748")
WHITE = white


class ScoreGauge(Flowable):
    """A visual score gauge."""
    def __init__(self, score, label, width=60, height=65):
        Flowable.__init__(self)
        self.score = score
        self.label = label
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        cx, cy = self.width / 2, self.height / 2 + 8
        r = 22
        c.setFillColor(GRAY_200)
        c.circle(cx, cy, r, fill=1, stroke=0)
        if self.score >= 70:
            color = ACCENT_GREEN
        elif self.score >= 50:
            color = ACCENT_ORANGE
        else:
            color = ACCENT_RED
        c.setFillColor(color)
        c.circle(cx, cy, r - 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.circle(cx, cy, r - 8, fill=1, stroke=0)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(cx, cy - 5, str(self.score))
        c.setFillColor(GRAY_700)
        c.setFont("Helvetica", 7)
        words = self.label.split()
        if len(words) > 2:
            c.drawCentredString(cx, cy - r - 12, " ".join(words[:2]))
            c.drawCentredString(cx, cy - r - 21, " ".join(words[2:]))
        else:
            c.drawCentredString(cx, cy - r - 14, self.label)


def get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontName='Helvetica-Bold', fontSize=26, leading=32,
        textColor=DARK_BLUE, spaceAfter=4, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'SectionTitle', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=16, leading=20,
        textColor=DARK_BLUE, spaceBefore=18, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        'SubSection', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=12, leading=16,
        textColor=MID_BLUE, spaceBefore=12, spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        'SubSubSection', parent=styles['Heading3'],
        fontName='Helvetica-Bold', fontSize=10, leading=14,
        textColor=GRAY_800, spaceBefore=10, spaceAfter=4
    ))
    styles['BodyText'].fontName = 'Helvetica'
    styles['BodyText'].fontSize = 9.5
    styles['BodyText'].leading = 14
    styles['BodyText'].textColor = GRAY_800
    styles['BodyText'].spaceAfter = 6
    styles.add(ParagraphStyle(
        'BodyLarge', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10.5, leading=15,
        textColor=GRAY_800, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        'BulletText', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=14,
        textColor=GRAY_800, spaceAfter=4, leftIndent=14,
        bulletIndent=0
    ))
    styles.add(ParagraphStyle(
        'StepText', parent=styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=14,
        textColor=GRAY_800, spaceAfter=3, leftIndent=20,
        bulletIndent=6
    ))
    styles.add(ParagraphStyle(
        'Tip', parent=styles['Normal'],
        fontName='Helvetica-Oblique', fontSize=9, leading=13,
        textColor=MID_BLUE, spaceAfter=8, leftIndent=10,
        borderWidth=0, borderPadding=4
    ))
    styles.add(ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8.5, leading=12,
        textColor=WHITE, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=GRAY_800, alignment=TA_LEFT
    ))
    styles.add(ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7, leading=9,
        textColor=GRAY_500, alignment=TA_CENTER
    ))
    return styles


def make_table(headers, rows, col_widths=None):
    styles = get_styles()
    header_row = [Paragraph(h, styles['TableHeader']) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), styles['TableCell']) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_300),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            cmds.append(('BACKGROUND', (0, i), (-1, i), GRAY_100))
    t.setStyle(TableStyle(cmds))
    return t


def make_highlight_box(text, color=LIGHT_BLUE, border=MID_BLUE):
    """Create a highlighted tip/info box."""
    styles = get_styles()
    data = [[Paragraph(text, styles['BodyText'])]]
    t = Table(data, colWidths=[140 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('BOX', (0, 0), (-1, -1), 1, border),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def add_header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(DARK_BLUE)
    canvas.setLineWidth(2)
    canvas.line(25 * mm, height - 18 * mm, width - 25 * mm, height - 18 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GRAY_500)
    canvas.drawString(25 * mm, height - 16 * mm, "FREEMAN CHIROPRACTIC  -  WEBSITE HEALTH CHECK")
    canvas.drawRightString(width - 25 * mm, height - 16 * mm, "www.freemanchiropractic.com.au")
    canvas.setStrokeColor(GRAY_300)
    canvas.setLineWidth(0.5)
    canvas.line(25 * mm, 18 * mm, width - 25 * mm, 18 * mm)
    canvas.drawString(25 * mm, 13 * mm, "Prepared March 2026")
    canvas.drawRightString(width - 25 * mm, 13 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf():
    output_path = "/Users/jackbarendse/Downloads/ChoreMax/SEO-Audit-Freeman-Chiropractic.pdf"
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=25 * mm, rightMargin=25 * mm,
        topMargin=22 * mm, bottomMargin=22 * mm
    )
    styles = get_styles()
    story = []
    W = A4[0] - 50 * mm

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 35 * mm))
    story.append(Paragraph("Website Health Check", styles['ReportTitle']))
    story.append(Spacer(1, 2))
    story.append(HRFlowable(width="100%", thickness=3, color=MID_BLUE, spaceBefore=2, spaceAfter=10))
    story.append(Paragraph("Freeman Chiropractic", ParagraphStyle(
        'CoverBiz', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18,
        textColor=GRAY_800, spaceAfter=4
    )))
    story.append(Paragraph("www.freemanchiropractic.com.au", ParagraphStyle(
        'CoverURL', parent=styles['Normal'], fontName='Helvetica', fontSize=13,
        textColor=MID_BLUE, spaceAfter=20
    )))

    cover_info = [
        ["Date", "10 March 2026"],
        ["Location", "249B Albany Hwy, Victoria Park, WA 6151"],
        ["Website Platform", "Squarespace"],
        ["Overall Score", "52 out of 100"],
    ]
    ct = Table(cover_info, colWidths=[40 * mm, 100 * mm])
    ct.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_600),
        ('TEXTCOLOR', (1, 0), (1, -1), GRAY_800),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, GRAY_200),
    ]))
    story.append(ct)
    story.append(Spacer(1, 25 * mm))

    # Score gauges
    gauges = [
        ScoreGauge(52, "Overall"),
        ScoreGauge(62, "Technical"),
        ScoreGauge(48, "Content"),
        ScoreGauge(55, "On-Page"),
        ScoreGauge(30, "Schema"),
        ScoreGauge(60, "Speed"),
    ]
    gt = Table([gauges], colWidths=[70] * 6)
    gt.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    story.append(gt)

    story.append(Spacer(1, 20 * mm))
    story.append(make_highlight_box(
        "<b>What does this report do?</b><br/><br/>"
        "This report checks how well your website is set up to appear in Google search results "
        "when people search for things like 'chiropractor Victoria Park' or 'back pain treatment Perth'. "
        "It looks at your website content, technical setup, and how you compare to what Google expects "
        "from a healthcare website.<br/><br/>"
        "We've organised everything into simple action steps you can follow, starting with the most impactful changes first."
    ))

    story.append(PageBreak())

    # =========================================================================
    # YOUR SCORES AT A GLANCE
    # =========================================================================
    story.append(Paragraph("Your Scores at a Glance", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_BLUE, spaceAfter=10))

    story.append(Paragraph(
        "Your website scored <b>52 out of 100</b>. That means there's a solid foundation to work with, "
        "but some important improvements will help more patients find you on Google.",
        styles['BodyLarge']
    ))
    story.append(Spacer(1, 6))

    story.append(make_table(
        ["Area", "Score", "What This Means"],
        [
            ["Technical Setup", "62 / 100", "Your site loads well and is mobile-friendly. A few settings need attention."],
            ["Content Quality", "48 / 100", "Your condition pages need more detail. Google expects thorough health content."],
            ["Page Titles & Headings", "55 / 100", "Most are good, but some pages are missing descriptions that show in Google."],
            ["Schema (Google Data)", "30 / 100", "Google can't read your business details properly. Easy to fix, big impact."],
            ["Page Speed", "60 / 100", "Decent speed. Some Squarespace limitations, but acceptable."],
            ["Images", "45 / 100", "Some images are missing descriptions that help Google understand them."],
            ["AI Search Readiness", "40 / 100", "Your site is currently hidden from AI search tools like ChatGPT and Perplexity."],
        ],
        col_widths=[35 * mm, 20 * mm, 75 * mm]
    ))

    story.append(Spacer(1, 10))
    story.append(make_highlight_box(
        "<b>Good news:</b> The most impactful improvements are things you can do yourself in Squarespace "
        "without needing a developer. Following the steps in this report could lift your score to <b>75-85 out of 100</b>."
    ))

    story.append(PageBreak())

    # =========================================================================
    # WHAT'S WORKING WELL
    # =========================================================================
    story.append(Paragraph("What's Working Well", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN, spaceAfter=10))

    story.append(Paragraph("Before we get into improvements, here's what your site is already doing right:", styles['BodyLarge']))
    story.append(Spacer(1, 4))

    good_items = [
        "<b>Clean web addresses</b> - Your page URLs are descriptive and include keywords (e.g. /back-pain-perth). This is great for Google.",
        "<b>Mobile-friendly</b> - Your site works well on phones and tablets thanks to Squarespace's built-in responsive design.",
        "<b>Secure connection (HTTPS)</b> - Your site has a valid security certificate, which Google requires.",
        "<b>Fast server response</b> - Your site responds in about 0.3 seconds, which is well within Google's target.",
        "<b>Good page titles</b> - Most of your page titles include your location and service, which helps Google understand what each page is about.",
        "<b>Clear site structure</b> - All your pages are accessible from the navigation menu within 1-2 clicks.",
        "<b>Strong team credentials</b> - Dr. Freeman's nearly 20 years of experience and Murdoch University qualifications are mentioned on the site.",
        "<b>Sitemap present</b> - Google can find all 15 of your pages through your sitemap.",
    ]
    for item in good_items:
        story.append(Paragraph(f"  \u2713  {item}", styles['BulletText']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 1: QUICK WINS (DO THIS WEEK)
    # =========================================================================
    story.append(Paragraph("Section 1: Quick Wins", styles['SectionTitle']))
    story.append(Paragraph("Do these this week - they take 1-2 hours total and have the biggest impact", ParagraphStyle(
        'SectionSub', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=10,
        textColor=GRAY_600, spaceAfter=12
    )))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_RED, spaceAfter=12))

    # --- Action 1: Meta Descriptions ---
    story.append(Paragraph("1. Add Page Descriptions (Meta Descriptions)", styles['SubSection']))
    story.append(Paragraph(
        "Right now, none of your pages have a custom description set. This is the short summary that "
        "appears under your page title in Google search results. Without one, Google guesses what to show, "
        "and it's often not the best text to convince someone to click.",
        styles['BodyText']
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>How to do it in Squarespace:</b>", styles['BodyText']))
    steps = [
        "Log into your Squarespace dashboard",
        "Click <b>Pages</b> in the left menu",
        "Hover over a page and click the <b>gear icon</b> (settings)",
        "Click the <b>SEO</b> tab",
        "Type your description in the <b>SEO Description</b> field",
        "Click <b>Save</b>, then repeat for each page",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", styles['StepText']))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Suggested descriptions for each page:</b>", styles['BodyText']))
    story.append(make_table(
        ["Page", "What to Type in the SEO Description Field"],
        [
            ["Home", "Freeman Chiropractic in Victoria Park, Perth. Expert chiropractic care for back pain, neck pain and headaches. Book your first appointment today. Ph: 0493 290 505"],
            ["Back Pain", "Effective back pain treatment in Victoria Park, Perth. Dr Alex Freeman provides expert chiropractic adjustments for lasting relief. Book online today."],
            ["Neck Pain", "Neck pain treatment by experienced Victoria Park chiropractors. Manual adjustments, dry needling and soft tissue therapy. Book at Freeman Chiropractic Perth."],
            ["Headaches", "Headache and migraine relief through chiropractic care in Victoria Park, Perth. Address the cause, not just symptoms. Book at Freeman Chiropractic."],
            ["Shoulder Pain", "Shoulder pain treatment in Victoria Park. Expert chiropractic care for rotator cuff, frozen shoulder and more. Freeman Chiropractic Perth."],
            ["Disc Injuries", "Disc injury treatment in Victoria Park, Perth. Non-surgical chiropractic care for bulging and herniated discs. Freeman Chiropractic."],
            ["Hip Pain", "Hip pain treatment in Victoria Park. Expert chiropractic assessment and care for hip joint issues. Freeman Chiropractic Perth. Ph: 0493 290 505"],
            ["Meet The Team", "Meet Dr Alex Freeman and the team at Freeman Chiropractic Victoria Park. Nearly 20 years experience in chiropractic care across Australia."],
            ["What To Expect", "What to expect at your first chiropractic visit at Freeman Chiropractic Victoria Park. Initial consultation, assessment and personalised care plan."],
            ["FAQs", "Frequently asked questions about chiropractic care at Freeman Chiropractic Victoria Park. Booking, referrals, safety, and what to expect."],
            ["Contact", "Contact Freeman Chiropractic Victoria Park. 249B Albany Hwy, WA 6151. Ph: 0493 290 505. Book online or email hello@freemanchiropractic.com.au"],
        ],
        col_widths=[25 * mm, 105 * mm]
    ))

    story.append(Spacer(1, 8))

    # --- Action 2: Fix Team Page Title ---
    story.append(Paragraph("2. Fix the 'Meet The Team' Page Title", styles['SubSection']))
    story.append(Paragraph(
        "Your team page currently has the exact same title as your homepage. Google sees this as a duplicate, "
        "which can hurt both pages. A unique title helps Google understand what each page is about.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>How to fix it:</b>", styles['BodyText']))
    steps2 = [
        "Go to <b>Pages</b> > hover over 'Meet The Team' > click the <b>gear icon</b>",
        "Click the <b>SEO</b> tab",
        'Change the <b>SEO Title</b> to: <b>"Meet Our Chiropractors | Dr Alex Freeman &amp; Team | Victoria Park Perth"</b>',
        "Click <b>Save</b>",
    ]
    for i, step in enumerate(steps2, 1):
        story.append(Paragraph(f"{i}. {step}", styles['StepText']))

    story.append(Spacer(1, 8))

    # --- Action 3: Unblock AI search ---
    story.append(Paragraph("3. Make Your Site Visible to AI Search Tools", styles['SubSection']))
    story.append(Paragraph(
        "Your website currently blocks AI-powered search tools like ChatGPT search, Google AI Overviews, "
        "and Perplexity from reading your content. This means when someone asks an AI tool "
        "'who is a good chiropractor in Victoria Park?', your practice can't appear in the answer.",
        styles['BodyText']
    ))
    story.append(Paragraph(
        "This is likely a default Squarespace setting. Removing the blocks is a quick change, but it's "
        "your call - some businesses prefer to keep AI bots blocked.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>How to fix it (if you want AI visibility):</b>", styles['BodyText']))
    story.append(Paragraph(
        "This one is best done by your web person (New Patient Engine) as it involves editing the robots.txt file. "
        "Ask them to remove the User-agent blocks for ClaudeBot, GPTBot, and Amazonbot.",
        styles['Tip']
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 2: IMPORTANT IMPROVEMENTS (NEXT 2-4 WEEKS)
    # =========================================================================
    story.append(Paragraph("Section 2: Important Improvements", styles['SectionTitle']))
    story.append(Paragraph("Tackle these over the next 2-4 weeks for significant ranking improvements", ParagraphStyle(
        'SectionSub2', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=10,
        textColor=GRAY_600, spaceAfter=12
    )))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_ORANGE, spaceAfter=12))

    # --- Action 4: Expand Condition Pages ---
    story.append(Paragraph("4. Add More Detail to Your Condition Pages", styles['SubSection']))
    story.append(Paragraph(
        "Your condition pages (back pain, neck pain, headaches, etc.) currently have around 800 words each. "
        "Because chiropractic is a health topic, Google holds these pages to a higher standard. "
        "Competing clinics that rank well typically have 1,500-2,500 words per condition page.",
        styles['BodyText']
    ))
    story.append(Paragraph(
        "This doesn't mean writing an essay - it means giving patients genuinely useful information "
        "that answers their questions before they even walk through your door.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>For each condition page, try adding sections like:</b>", styles['BodyText']))

    expand_items = [
        "<b>What is this condition?</b> - A brief, plain-English explanation. E.g. 'Back pain affects up to 80% of Australians at some point...'",
        "<b>Common causes</b> - Expand your existing list with a sentence or two per cause",
        "<b>Symptoms to look for</b> - A checklist patients can relate to",
        "<b>When should you see a chiropractor?</b> - Help people decide if chiropractic is right for them",
        "<b>How we treat it at Freeman Chiropractic</b> - Describe the specific techniques Dr. Freeman and Dr. Maylor use",
        "<b>What to expect during your visit</b> - Walk them through the process",
        "<b>Tips for managing at home</b> - Simple stretches, posture tips, etc.",
        "<b>Common questions</b> - Add 3-5 FAQs specific to that condition",
        "<b>Author credit</b> - Add 'Written by Dr Alex Freeman, Chiropractor' at the bottom with a link to the team page",
    ]
    for item in expand_items:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))

    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Start with your <b>Back Pain</b> page (likely your most searched condition), then work through the others at a pace of 1-2 pages per week.",
        styles['Tip']
    ))

    story.append(Spacer(1, 10))

    # --- Action 5: Add Reviews ---
    story.append(Paragraph("5. Add Patient Reviews to Your Website", styles['SubSection']))
    story.append(Paragraph(
        "There are currently no patient reviews or testimonials visible anywhere on your site. "
        "Reviews are one of the strongest trust signals for both Google and potential patients. "
        "A person searching for a chiropractor is much more likely to book if they can see that others "
        "have had a good experience.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>Options (easiest first):</b>", styles['BodyText']))

    review_options = [
        "<b>Add a testimonials section to your homepage</b> - In Squarespace, add a 'Quote' block. Include the patient's first name and a short quote about their experience. You only need 3-5 to start.",
        "<b>Embed your Google Reviews</b> - Tools like Elfsight or EmbedSocial let you display your Google Reviews directly on your site. They typically cost $5-15/month and take about 30 minutes to set up.",
        "<b>Create a dedicated Reviews page</b> - If you collect reviews via email or forms, create a page showcasing the best ones.",
    ]
    for item in review_options:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))

    story.append(Spacer(1, 10))

    # --- Action 6: Author Bylines ---
    story.append(Paragraph("6. Credit the Author on Health Pages", styles['SubSection']))
    story.append(Paragraph(
        "Google pays special attention to <b>who wrote health content</b>. Right now, your condition pages "
        "don't say who wrote them. Adding Dr. Freeman's name and qualifications to each page tells Google "
        "'this was written by a qualified professional, not a random content writer'.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>What to add at the bottom of each condition page:</b>", styles['BodyText']))
    story.append(make_highlight_box(
        "<i>Reviewed by Dr Alex Freeman, Chiropractor<br/>"
        "B.Chiro, M.Chiro (Murdoch University)<br/>"
        "Last updated: [month] 2026</i>"
    ))
    story.append(Paragraph("Make Dr. Freeman's name a link to the Meet The Team page.", styles['Tip']))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 3: ASK YOUR WEB PERSON TO DO THESE
    # =========================================================================
    story.append(Paragraph("Section 3: For Your Web Person", styles['SectionTitle']))
    story.append(Paragraph("Send these to New Patient Engine or your web developer", ParagraphStyle(
        'SectionSub3', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=10,
        textColor=GRAY_600, spaceAfter=12
    )))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_BLUE, spaceAfter=12))

    story.append(Paragraph(
        "The following improvements involve adding code to your website. They're straightforward for "
        "anyone who manages Squarespace sites, but you shouldn't need to do these yourself.",
        styles['BodyLarge']
    ))

    # --- Action 7: Schema ---
    story.append(Paragraph("7. Add Proper Business Information for Google (Schema Markup)", styles['SubSection']))
    story.append(Paragraph(
        "<b>What this means:</b> Schema markup is hidden code that tells Google exactly what your business is, "
        "where you're located, your opening hours, phone number, and what services you offer. "
        "Right now, your site has a basic version that's missing most of these details.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>Why it matters:</b> Proper schema helps you appear in:", styles['BodyText']))
    schema_benefits = [
        "Google's 'Local Pack' (the map results at the top of search)",
        "Google's Knowledge Panel (the business info box on the right side)",
        "Rich search results with your hours, phone number, and rating",
    ]
    for item in schema_benefits:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))

    story.append(Paragraph("<b>What to ask your web person:</b>", styles['BodyText']))
    story.append(make_highlight_box(
        "Please update our schema markup to use the 'Chiropractor' type (instead of generic LocalBusiness) "
        "and include:<br/>"
        "- Phone: 0493 290 505<br/>"
        "- Email: hello@freemanchiropractic.com.au<br/>"
        "- Full address with GPS coordinates<br/>"
        "- Opening hours (Tues-Sat schedule)<br/>"
        "- Facebook page link<br/>"
        "- Service areas (Victoria Park, Perth, East Vic Park, South Perth, Bentley, Carlisle)<br/><br/>"
        "Also please add a 'Person' schema for Dr Alex Freeman and Dr Joel Maylor on the team page, "
        "and add BreadcrumbList schema to all inner pages.<br/><br/>"
        "The full JSON-LD code is provided in the companion markdown files."
    ))

    story.append(Spacer(1, 10))

    # --- Action 8: URL Cleanup ---
    story.append(Paragraph("8. Clean Up Duplicate Pages", styles['SubSection']))
    story.append(Paragraph(
        "Your site has a couple of duplicate or oddly-named pages that could confuse Google:",
        styles['BodyText']
    ))
    story.append(make_table(
        ["Issue", "What to Do"],
        [
            ["/book-online-1", "Redirect this to /book-online (it appears to be a duplicate)"],
            ["/home", "This is a duplicate of your homepage (/). Remove it from the sitemap or redirect it."],
            ["/our-story-1", "Rename to /our-story if possible (the '-1' suffix looks odd)"],
            ["'Careers' nav link", "This currently links to /book-online-1. Update it to link to the correct page."],
        ],
        col_widths=[35 * mm, 95 * mm]
    ))

    story.append(Spacer(1, 10))

    # --- Action 9: Image Alt Text ---
    story.append(Paragraph("9. Add Descriptions to All Images (Alt Text)", styles['SubSection']))
    story.append(Paragraph(
        "Alt text is a short description of each image that helps Google understand what's in the picture. "
        "It also helps vision-impaired visitors who use screen readers. Several of your images are missing "
        "this or have generic text like the filename.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>You can do this yourself in Squarespace:</b>", styles['BodyText']))
    alt_steps = [
        "Click on any image in the page editor",
        "Click the <b>pencil icon</b> (edit)",
        "Find the <b>Image Alt Text</b> or <b>Description</b> field",
        "Type a brief description of what's in the image",
    ]
    for i, step in enumerate(alt_steps, 1):
        story.append(Paragraph(f"{i}. {step}", styles['StepText']))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Examples of good alt text:</b>", styles['BodyText']))
    story.append(make_table(
        ["Image", "Good Alt Text"],
        [
            ["Dr Freeman headshot", "Dr Alex Freeman, Chiropractor at Freeman Chiropractic Victoria Park"],
            ["Dr Maylor headshot", "Dr Joel Maylor, Chiropractor at Freeman Chiropractic Victoria Park"],
            ["Back pain treatment photo", "Chiropractor performing spinal adjustment for back pain treatment"],
            ["Clinic exterior", "Freeman Chiropractic clinic at 249B Albany Hwy, Victoria Park"],
            ["Logo", "Freeman Chiropractic logo"],
        ],
        col_widths=[40 * mm, 90 * mm]
    ))

    story.append(PageBreak())

    # =========================================================================
    # SECTION 4: ONGOING IMPROVEMENTS
    # =========================================================================
    story.append(Paragraph("Section 4: Ongoing Improvements", styles['SectionTitle']))
    story.append(Paragraph("Work on these over the coming months to keep building your online presence", ParagraphStyle(
        'SectionSub4', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=10,
        textColor=GRAY_600, spaceAfter=12
    )))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT_GREEN, spaceAfter=12))

    # --- Action 10: Cross-Linking ---
    story.append(Paragraph("10. Link Your Condition Pages to Each Other", styles['SubSection']))
    story.append(Paragraph(
        "Your condition pages currently only link to the booking page. Adding links between related "
        "conditions helps Google understand your site structure and keeps visitors engaged longer.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>Examples of links to add:</b>", styles['BodyText']))
    crosslinks = [
        "On your <b>Back Pain</b> page, add a sentence like: 'Back pain can sometimes be related to "
        "<u>disc injuries</u> or <u>hip pain</u>. Learn more about how we treat these conditions.'",
        "On your <b>Neck Pain</b> page: 'Neck pain is a common cause of <u>headaches</u>. "
        "We also treat <u>shoulder pain</u> that often accompanies neck issues.'",
        "On your <b>Disc Injuries</b> page: 'Disc injuries frequently cause <u>back pain</u> "
        "and <u>neck pain</u>. Learn about our approach to these conditions.'",
    ]
    for item in crosslinks:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))
    story.append(Paragraph("Make the underlined words clickable links to the relevant pages.", styles['Tip']))

    story.append(Spacer(1, 10))

    # --- Action 11: Blog ---
    story.append(Paragraph("11. Start a Blog (Even 1-2 Posts Per Month)", styles['SubSection']))
    story.append(Paragraph(
        "A blog helps you appear in Google for more search terms and shows Google that your site is "
        "active and authoritative. You don't need to write War and Peace - short, practical articles "
        "that answer common patient questions work best.",
        styles['BodyText']
    ))
    story.append(Paragraph("<b>Easy blog topic ideas:</b>", styles['BodyText']))
    blog_topics = [
        '"5 Desk Stretches to Prevent Back Pain" - practical tips for office workers',
        '"How Often Should You See a Chiropractor?" - answers a common Google search',
        '"Chiropractic vs Physiotherapy: Which Is Right for You?" - comparison that people search for',
        '"Understanding Sciatica: Causes and Chiropractic Treatment" - targets a specific condition search',
        '"Benefits of Chiropractic Care for Office Workers in Perth" - local + topic targeting',
    ]
    for item in blog_topics:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))

    story.append(Spacer(1, 10))

    # --- Action 12: Trust Badges ---
    story.append(Paragraph("12. Add Professional Trust Badges", styles['SubSection']))
    story.append(Paragraph(
        "Displaying your professional registrations and memberships builds trust with both Google and patients. "
        "Add these to your homepage and team page:",
        styles['BodyText']
    ))
    trust_items = [
        "<b>AHPRA registration number</b> - Shows you're registered with Australia's health practitioner regulator",
        "<b>Chiropractic Australia membership</b> - Professional association badge",
        "<b>HICAPS accepted</b> - Lets patients know they can claim on the spot",
    ]
    for item in trust_items:
        story.append(Paragraph(f"  \u2022  {item}", styles['BulletText']))

    story.append(Spacer(1, 10))

    # --- Action 13: Update FAQ reference ---
    story.append(Paragraph("13. Update the Safety Reference on Your FAQ Page", styles['SubSection']))
    story.append(Paragraph(
        "Your FAQ page currently references a 1979 New Zealand government study to support chiropractic safety. "
        "While that study was positive, citing something from 47 years ago can actually undermine trust. "
        "Replace it with more recent evidence - your professional association (Chiropractic Australia) "
        "will have current position statements you can reference.",
        styles['BodyText']
    ))

    story.append(Spacer(1, 10))

    # --- Action 14: Instagram ---
    story.append(Paragraph("14. Add Instagram to Your Social Presence", styles['SubSection']))
    story.append(Paragraph(
        "You currently only have Facebook linked. Instagram is excellent for healthcare businesses - "
        "you can share clinic photos, exercise tips, team updates, and patient success stories (with permission). "
        "Zoe, your admin assistant, already manages social media content, so this could be a natural extension.",
        styles['BodyText']
    ))

    story.append(PageBreak())

    # =========================================================================
    # YOUR ACTION TIMELINE
    # =========================================================================
    story.append(Paragraph("Your Action Timeline", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_BLUE, spaceAfter=12))

    story.append(Paragraph(
        "Here's a realistic timeline for tackling everything. You don't need to do it all at once - "
        "steady progress is what matters.",
        styles['BodyLarge']
    ))
    story.append(Spacer(1, 6))

    story.append(make_table(
        ["When", "What to Do", "Who", "Impact"],
        [
            ["This week", "Add page descriptions to all pages (#1)", "You", "High"],
            ["This week", "Fix team page title (#2)", "You", "Quick fix"],
            ["This week", "Send schema + AI crawler tasks to web person (#3, #7)", "Web person", "High"],
            ["Week 2", "Start expanding Back Pain page (#4)", "You / Dr. Freeman", "High"],
            ["Week 2", "Add author bylines to condition pages (#6)", "You", "Medium"],
            ["Week 2", "Fix image alt text (#9)", "You", "Medium"],
            ["Week 3", "Set up Google Reviews on site (#5)", "Web person", "High"],
            ["Week 3", "Expand Neck Pain + Headaches pages (#4)", "You / Dr. Freeman", "High"],
            ["Week 4", "Clean up duplicate URLs (#8)", "Web person", "Medium"],
            ["Week 4", "Expand remaining condition pages (#4)", "You / Dr. Freeman", "High"],
            ["Month 2+", "Start blog (#11), add trust badges (#12)", "You / Zoe", "Ongoing"],
            ["Month 2+", "Add cross-links between pages (#10)", "You", "Medium"],
            ["Ongoing", "Update FAQ (#13), add Instagram (#14)", "You / Zoe", "Low-Med"],
        ],
        col_widths=[22 * mm, 58 * mm, 28 * mm, 22 * mm]
    ))

    story.append(Spacer(1, 12))
    story.append(make_highlight_box(
        "<b>Expected results:</b> After completing the first month of improvements, your site should score "
        "around <b>70-75 out of 100</b>. After 2-3 months of steady work (including blog content and reviews), "
        "you could reach <b>80-85 out of 100</b> - putting you well ahead of most chiropractic websites in the Perth area."
    ))

    story.append(PageBreak())

    # =========================================================================
    # JARGON BUSTER
    # =========================================================================
    story.append(Paragraph("Jargon Buster", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_BLUE, spaceAfter=12))

    story.append(Paragraph(
        "Here are plain-English explanations of the technical terms used in this report:",
        styles['BodyLarge']
    ))
    story.append(Spacer(1, 4))

    jargon = [
        ["SEO", "Search Engine Optimisation - the practice of making your website appear higher in Google search results."],
        ["Meta Description", "The short summary (1-2 sentences) that appears below your page title in Google search results. You control what this says."],
        ["Schema Markup", "Hidden code on your website that tells Google specific facts about your business (name, address, hours, services). Helps you appear in map results and rich search results."],
        ["Alt Text", "A text description attached to an image. Google reads this to understand what's in the picture. Also helps vision-impaired visitors."],
        ["YMYL", "'Your Money or Your Life' - Google's term for health, financial, and safety topics. These pages are held to higher quality standards because wrong information could harm people."],
        ["E-E-A-T", "Experience, Expertise, Authoritativeness, Trustworthiness - the four things Google looks for in health content to decide if it's reliable."],
        ["robots.txt", "A file on your website that tells search engines (and AI tools) which parts of your site they can and can't read."],
        ["Sitemap", "A file that lists all the pages on your website so Google can find them easily. Yours is working correctly."],
        ["HTTPS", "The secure version of your website connection (the padlock icon in the browser). Required by Google for ranking."],
        ["Core Web Vitals", "Google's measurements of how fast your website loads and how smooth it feels to use. There are three main scores: loading speed, responsiveness, and visual stability."],
        ["Canonical", "When you have two URLs showing the same content, the canonical tag tells Google which one is the 'real' version to show in search results."],
        ["301 Redirect", "An automatic forwarding from one web address to another. Like mail forwarding when you move house."],
        ["HSTS", "A security setting that forces browsers to always use the secure (HTTPS) version of your site."],
        ["JSON-LD", "The specific code format used for schema markup. Your web person will know what this means."],
        ["AI Overviews", "Google's AI-generated answer boxes that appear at the top of some search results. Your site needs to be readable by AI tools to appear here."],
    ]
    story.append(make_table(
        ["Term", "What It Means"],
        jargon,
        col_widths=[30 * mm, 100 * mm]
    ))

    story.append(PageBreak())

    # =========================================================================
    # FULL PAGE INVENTORY
    # =========================================================================
    story.append(Paragraph("Your Website Pages", styles['SectionTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_BLUE, spaceAfter=12))

    story.append(Paragraph("Here is every page on your website that Google knows about:", styles['BodyLarge']))
    story.append(Spacer(1, 4))

    story.append(make_table(
        ["#", "Page Address", "Page Name", "Notes"],
        [
            ["1", "/", "Homepage", "Working well"],
            ["2", "/book-online", "Book Online", "Working well"],
            ["3", "/back-pain-perth", "Back Pain", "Needs more content"],
            ["4", "/neck-pain-perth", "Neck Pain", "Needs more content"],
            ["5", "/headaches-perth", "Headaches", "Needs more content"],
            ["6", "/shoulder-pain-perth", "Shoulder Pain", "Needs more content"],
            ["7", "/disc-injuries-perth", "Disc Injuries", "Needs more content"],
            ["8", "/hip-pain-perth", "Hip Pain", "Needs more content"],
            ["9", "/dr-alex-freeman-perth-chiropractor", "Meet The Team", "Fix title tag"],
            ["10", "/what-to-expect", "What To Expect", "Could be longer"],
            ["11", "/faqs", "FAQs", "Update safety reference"],
            ["12", "/contact", "Contact", "Working well"],
            ["13", "/our-story-1", "Our Story", "Rename URL"],
            ["14", "/privacy", "Privacy Policy", "Working well"],
            ["15", "/book-online-1", "Book Online (duplicate)", "Remove or redirect"],
            ["16", "/home", "Home (duplicate)", "Remove or redirect"],
        ],
        col_widths=[8 * mm, 52 * mm, 30 * mm, 40 * mm]
    ))

    # =========================================================================
    # BUILD
    # =========================================================================
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"PDF generated: {output_path}")
    print(f"File size: {os.path.getsize(output_path) / 1024:.0f} KB")


if __name__ == "__main__":
    build_pdf()
