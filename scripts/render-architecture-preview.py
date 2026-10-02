"""Render a portable PNG preview of page 1 of the editable CloudPrint diagram."""

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs/architecture/cloudprint-system-architecture.png"
WIDTH, HEIGHT = 2000, 1420


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    face = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(face, size)


def lines(text: str, width: int, size: int) -> list[str]:
    words = text.split()
    result: list[str] = []
    current = ""
    for word in words:
        proposed = f"{current} {word}".strip()
        if font(size).getlength(proposed) > width and current:
            result.append(current)
            current = word
        else:
            current = proposed
    if current:
        result.append(current)
    return result


def box(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, title: str, body: str, fill: str, stroke: str) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=fill, outline=stroke, width=3)
    title_size = 23
    while title_size > 16 and font(title_size, True).getlength(title) > w - 40:
        title_size -= 1
    draw.text((x + 20, y + 16), title, font=font(title_size, True), fill="#17263c")
    text_y = y + 52
    for text_line in lines(body, w - 40, 16):
        draw.text((x + 20, text_y), text_line, font=font(16), fill="#34445a")
        text_y += 21


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], label: str = "", color: str = "#75859a") -> None:
    draw.line((start, end), fill=color, width=4)
    x, y = end
    if abs(end[0] - start[0]) >= abs(end[1] - start[1]):
        polygon = [(x, y), (x - 14 if x > start[0] else x + 14, y - 8), (x - 14 if x > start[0] else x + 14, y + 8)]
    else:
        polygon = [(x, y), (x - 8, y - 14 if y > start[1] else y + 14), (x + 8, y - 14 if y > start[1] else y + 14)]
    draw.polygon(polygon, fill=color)
    if label:
        midpoint = ((start[0] + end[0]) // 2, (start[1] + end[1]) // 2)
        draw.text((midpoint[0] - 20, midpoint[1] - 27), label, font=font(15), fill="#34445a")


image = Image.new("RGB", (WIDTH, HEIGHT), "#ffffff")
draw = ImageDraw.Draw(image)

draw.text((70, 45), "CloudPrint CM / System architecture", font=font(42, True), fill="#17263c")
draw.text((70, 102), "TypeScript backend + Flutter mobile, web, and desktop application", font=font(23), fill="#52647a")

cloud = (310, 185, 1110, 990)
shop = (1190, 185, 1910, 990)
draw.rounded_rectangle(cloud, radius=24, fill="#fafcff", outline="#4569b2", width=4)
draw.rounded_rectangle(shop, radius=24, fill="#fbfefa", outline="#368453", width=4)
draw.text((340, 205), "CLOUD / initial single VPS · separate processes", font=font(22, True), fill="#254a83")
draw.text((1220, 205), "SHOP / Windows · macOS · Ubuntu", font=font(22, True), fill="#27673f")

blue, blue_stroke = "#e8f0ff", "#4569b2"
green, green_stroke = "#e6f4ea", "#368453"
orange, orange_stroke = "#fff1da", "#b87b20"
gray, gray_stroke = "#f3f5f8", "#8390a3"

box(draw, 70, 310, 180, 104, "Student", "WhatsApp + Flutter", gray, gray_stroke)
box(draw, 345, 280, 200, 126, "WhatsApp gateway", "Baileys session · message inbox", blue, blue_stroke)
box(draw, 640, 280, 200, 126, "Application core", "Jobs · pricing · payments · shops", blue, blue_stroke)
box(draw, 900, 280, 180, 126, "API / realtime", "HTTPS · Socket.IO · auth", blue, blue_stroke)
box(draw, 550, 495, 200, 126, "PostgreSQL", "Authoritative state · inbox · outbox", blue, blue_stroke)
box(draw, 830, 495, 200, 126, "Outbox dispatcher", "Durable delivery · stable task IDs", blue, blue_stroke)
box(draw, 345, 700, 200, 126, "Payment boundary", "Verified callback · reconciliation", orange, orange_stroke)
box(draw, 650, 700, 200, 126, "Redis / BullMQ", "Bounded retries · job IDs only", orange, orange_stroke)
box(draw, 900, 700, 180, 126, "Background workers", "Documents · notices · retention", blue, blue_stroke)
box(draw, 90, 700, 180, 126, "MoMo aggregator", "MTN / Orange provider adapter", orange, orange_stroke)
box(draw, 550, 870, 200, 86, "Private file store", "Source + exact PDF", blue, blue_stroke)

box(draw, 1240, 280, 230, 126, "Flutter shop host", "Queue · staff actions · device credential", green, green_stroke)
box(draw, 1600, 280, 220, 126, "Shop worker", "Confirms output and collection", green, green_stroke)
box(draw, 1240, 525, 230, 126, "SQLite + file cache", "Durable attempts · pending sync", green, green_stroke)
box(draw, 1600, 525, 220, 126, "Printer bridge", "Capabilities · platform adapters", green, green_stroke)
box(draw, 1600, 760, 220, 126, "OS print queue", "Installed drivers · physical printer", green, green_stroke)

arrow(draw, (250, 360), (345, 360), "chat")
arrow(draw, (545, 343), (640, 343), "commands")
arrow(draw, (840, 343), (900, 343), "use cases")
arrow(draw, (740, 406), (650, 495), "transactions")
arrow(draw, (750, 558), (830, 558), "pending events")
arrow(draw, (930, 621), (940, 700), "tasks")
arrow(draw, (1000, 700), (1010, 621), "consume")
arrow(draw, (990, 826), (750, 870), "prepare PDF")
arrow(draw, (270, 762), (345, 762), "callback")
arrow(draw, (545, 762), (640, 762), "verified")
arrow(draw, (1080, 343), (1240, 343), "TLS · sync", "#368453")
arrow(draw, (1355, 406), (1355, 525), "persist", "#368453")
arrow(draw, (1470, 588), (1600, 588), "staff-approved", "#368453")
arrow(draw, (1710, 651), (1710, 760), "submit", "#368453")
arrow(draw, (1600, 343), (1470, 343), "confirm", "#368453")

draw.rounded_rectangle((70, 1080, 1910, 1320), radius=20, fill="#f7f9fc", outline="#c8d2df", width=3)
notes = [
    ("Boundaries", "The desktop makes outbound connections; no inbound shop port. Rooms derive from authenticated shop membership."),
    ("Durability", "PostgreSQL owns business state. Redis executes work. SQLite records local submission attempts and pending sync commands."),
    ("Printing", "Staff click Print. Spooler acceptance is not physical completion. Reconnect never automatically reprints an uncertain attempt."),
]
for index, (heading, body) in enumerate(notes):
    y = 1110 + index * 68
    draw.text((105, y), f"{heading}:", font=font(20, True), fill="#17263c")
    draw.text((260, y), body, font=font(19), fill="#34445a")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, format="PNG", optimize=True)
print(OUTPUT)
