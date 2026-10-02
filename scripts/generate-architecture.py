"""Generate editable draw.io architecture pages using the Python standard library."""

from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/architecture/cloudprint-architecture.drawio"
COLORS = {
    "blue": ("#e8f0ff", "#4569b2"),
    "green": ("#e6f4ea", "#368453"),
    "orange": ("#fff1da", "#b87b20"),
    "red": ("#fde9e7", "#bc5149"),
    "gray": ("#f3f5f8", "#8390a3"),
}
document = ET.Element("mxfile", host="app.diagrams.net", agent="CloudPrint CM", version="24.7.17")


class Page:
    def __init__(self, name, title, subtitle, width=1280, height=920):
        page = ET.SubElement(document, "diagram", id=name.split(" ")[0], name=name)
        model = ET.SubElement(page, "mxGraphModel", dx=str(width), dy=str(height),
                              grid="1", gridSize="10", guides="1", tooltips="1",
                              connect="1", arrows="1", fold="1", page="1", pageScale="1",
                              pageWidth=str(width), pageHeight=str(height),
                              background="#ffffff", adaptiveColors="auto")
        self.root = ET.SubElement(model, "root")
        ET.SubElement(self.root, "mxCell", id="0")
        ET.SubElement(self.root, "mxCell", id="1", parent="0")
        self.parents = {}
        self.edge_count = 0
        self.text("title", title, 40, 20, width-80, 36, 26, True)
        self.text("subtitle", subtitle, 40, 62, width-80, 34, 13)

    def node(self, id, label, x, y, w=140, h=60, color="blue", parent="1", extra=""):
        fill, stroke = COLORS[color]
        cell = ET.SubElement(self.root, "mxCell", id=id, value=label, vertex="1", parent=parent,
                             style=f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
                                   f"fontColor=#17263c;fontSize=12;spacing=7;arcSize=12;{extra}")
        ET.SubElement(cell, "mxGeometry", x=str(x), y=str(y), width=str(w), height=str(h), **{"as": "geometry"})
        self.parents[id] = parent
        return id

    def text(self, id, label, x, y, w, h, size=13, bold=False):
        return self.node(id, label, x, y, w, h, "gray", extra=
                         f"shape=text;strokeColor=none;fillColor=none;align=left;fontSize={size};fontStyle={1 if bold else 0};")

    def container(self, id, label, x, y, w, h, color="gray"):
        return self.node(id, label, x, y, w, h, color, extra=
                         "shape=swimlane;startSize=30;horizontal=1;container=1;pointerEvents=0;collapsible=0;fontStyle=1;")

    def edge(self, source, target, label="", color="gray", dashed=False, er=False):
        self.edge_count += 1
        ancestors = [self.parents[source]]
        while ancestors[-1] != "1":
            ancestors.append(self.parents[ancestors[-1]])
        parent = self.parents[target]
        while parent not in ancestors:
            parent = self.parents[parent]
        style = "edgeStyle=entityRelationEdgeStyle;startArrow=ERone;endArrow=ERmany;" if er else "edgeStyle=orthogonalEdgeStyle;endArrow=block;"
        cell = ET.SubElement(self.root, "mxCell", id=f"edge-{self.edge_count}", value=label,
                             edge="1", parent=parent, source=source, target=target,
                             style=style + f"rounded=1;html=1;fontSize=11;fontColor=#34445a;labelBackgroundColor=#ffffff;strokeWidth=1.5;strokeColor={COLORS[color][1]};dashed={int(dashed)};")
        ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})


p = Page("01 System architecture", "CloudPrint CM / System architecture",
         "TypeScript backend + Flutter mobile, web, and desktop app • proposed implementation boundaries", 1400, 980)
p.container("cloud", "CLOUD / initial single VPS · separate processes", 220, 120, 600, 640)
p.container("shop", "SHOP / Windows · macOS · Ubuntu", 860, 120, 490, 640, "green")
p.node("student", "<b>Student</b><br>WhatsApp + Flutter", 40, 160, color="gray")
p.node("gateway", "<b>WhatsApp gateway</b><br>Baileys session<br>Message inbox", 20, 40, parent="cloud")
p.node("core", "<b>Application core</b><br>Jobs · pricing<br>Payments · shops", 220, 40, parent="cloud")
p.node("api", "<b>API / realtime</b><br>HTTPS + Socket.IO<br>Shop authorization", 420, 40, parent="cloud")
p.node("db", "<b>PostgreSQL</b><br>Authoritative state<br>Inbox + outbox", 220, 180, parent="cloud", extra="shape=cylinder3;")
p.node("dispatch", "<b>Outbox dispatcher</b><br>Retry delivery<br>Stable task IDs", 420, 180, parent="cloud")
p.node("provider", "<b>MoMo aggregator</b><br>MTN / Orange<br>Provider adapter", 40, 420, color="orange")
p.node("payments", "<b>Payment boundary</b><br>Verified callbacks<br>Reconciliation", 20, 300, parent="cloud", color="orange")
p.node("files", "<b>Private file store</b><br>Source + exact PDF<br>Scoped downloads", 220, 440, parent="cloud", extra="shape=cylinder3;")
p.node("queues", "<b>Redis / BullMQ</b><br>Bounded retries<br>IDs, not file bytes", 420, 300, parent="cloud", color="orange")
p.node("workers", "<b>Background workers</b><br>Documents · notices<br>Reconcile · retention", 420, 440, parent="cloud")
p.node("desktop", "<b>Flutter shop host</b><br>Queue + staff actions<br>Device credential", 40, 40, parent="shop", color="green")
p.node("local", "<b>SQLite + file cache</b><br>Durable attempts<br>Pending sync events", 40, 180, parent="shop", color="green", extra="shape=cylinder3;")
p.node("bridge", "<b>Printer bridge</b><br>Capabilities + submit<br>Platform adapters", 280, 180, parent="shop", color="green")
p.node("printer", "<b>OS print queue</b><br>Installed drivers<br>Physical printer", 280, 320, parent="shop", color="green")
p.node("staff", "<b>Shop worker</b><br>Confirms output<br>Confirms collection", 40, 440, parent="shop", color="green")
for a,b,l in [("student","gateway","chat"),("gateway","core","commands"),("core","api","use cases"),("core","db","transactions"),("db","dispatch","pending events"),("dispatch","queues","tasks"),("queues","workers","consume"),("workers","files","prepare PDF"),("provider","payments","callback / query"),("payments","core","verified result"),("api","desktop","TLS · sync"),("desktop","local","persist"),("local","bridge","staff-approved"),("bridge","printer","submit"),("staff","desktop","confirm")]:
    p.edge(a,b,l, "green" if a in ["api","desktop","local","bridge","staff"] else "gray")
p.text("notes", "<b>Boundaries:</b> The desktop initiates outbound connections; no inbound shop port. Rooms derive from authenticated shop membership.<br><b>Durability:</b> PostgreSQL owns business state. Redis executes work. SQLite records local submission attempts.<br><b>Printing:</b> Staff click Print. Spooler acceptance is not physical completion. Reconnect never automatically reprints an uncertain attempt.", 40, 800, 1310, 115)

p = Page("02 End-to-end flow", "CloudPrint CM / Upload to collection",
         "Read each row left to right. Payment and print uncertainties go to review, never blind retries.", 1320, 1020)
steps = [
    ("select", "<b>01 · Choose shop</b><br>Available location<br>and supported options",0,0,"gray"),
    ("upload", "<b>02 · Upload</b><br>PDF / DOCX<br>≤ 15,000,000 bytes",1,0,"gray"),
    ("ingest", "<b>03 · Receive</b><br>Dedupe message<br>Stream to quarantine",2,0,"blue"),
    ("prepare", "<b>04 · Prepare</b><br>Validate; DOCX → PDF<br>Count final PDF pages",3,0,"blue"),
    ("bad", "<b>Rejected document</b><br>Explain error<br>Request replacement",3,1,"red"),
    ("configure", "<b>05 · Configure</b><br>B&amp;W / colour<br>Copies · A4 simplex",0,2,"gray"),
    ("quote", "<b>06 · Confirm quote</b><br>Pages × copies × rate<br>+ 50 XAF per job",1,2,"blue"),
    ("pay", "<b>07 · Request payment</b><br>Persist attempt first<br>Lock active request",2,2,"orange"),
    ("pin", "<b>08 · Phone approval</b><br>Provider prompt<br>PIN stays with carrier",3,2,"orange"),
    ("verify", "<b>09 · Verify result</b><br>Webhook / status query<br>Reference + amount",3,3,"orange"),
    ("review", "<b>Payment uncertain</b><br>Reconcile same attempt<br>No second charge",4,3,"red"),
    ("commit", "<b>10 · Commit paid job</b><br>Payment + ticket<br>+ outbox, atomically",2,3,"blue"),
    ("notify", "<b>11 · Deliver notice</b><br>WhatsApp ticket<br>Shop queue changed",1,3,"blue"),
    ("sync", "<b>12 · Sync + reserve</b><br>Shop fetches queue<br>One device owns job",0,3,"green"),
    ("cache", "<b>13 · Cache locally</b><br>Verify PDF checksum<br>Persist authorization",0,5,"green"),
    ("print", "<b>14 · Staff clicks Print</b><br>Persist attempt<br>Submit via OS driver",1,5,"green"),
    ("ready", "<b>15 · Confirm output</b><br>Worker checks paper<br>Notify ready to collect",2,5,"green"),
    ("collect", "<b>16 · Collection</b><br>Verify ticket + handover<br>Mark COMPLETED",3,5,"green"),
    ("unknown", "<b>Submission uncertain</b><br>Freeze automatic retry<br>Staff reconciliation",1,6,"red"),
]
for id,label,col,row,color in steps:
    p.node(id,label,40+col*250,125+row*115,w=210,h=72,color=color)
for a,b in zip(["select","upload","ingest"],["upload","ingest","prepare"]): p.edge(a,b)
p.edge("prepare","bad","invalid","red")
p.edge("prepare","configure","valid PDF")
for a,b in [("configure","quote"),("quote","pay"),("pay","pin"),("pin","verify"),("verify","commit"),("commit","notify"),("notify","sync"),("sync","cache"),("cache","print"),("print","ready"),("ready","collect")]: p.edge(a,b)
p.edge("verify","review","unknown","red")
p.edge("print","unknown","uncertain","red")
p.text("legend", "<b>Offline:</b> Only a job already reserved to this device, with its PDF and authorization persisted, may print offline.<br><b>Failed payment:</b> Confirm provider failure before offering a fresh attempt. Late successes enter reconciliation/refund review.<br><b>Formats:</b> Always price and print the same prepared PDF. Numbered text menus remain available if interactive messages fail.",40,940,1240,75)

p = Page("03 State and recovery", "CloudPrint CM / State and recovery",
         "Separate document readiness, money movement, fulfilment, and each physical submission attempt.", 1360, 1060)
groups = [
    ("Document",120,"blue",["RECEIVED","PROCESSING","READY","REJECTED"]),
    ("Payment attempt",300,"orange",["CREATED","PENDING","SUCCEEDED","FAILED / CANCELLED"]),
    ("Print job",480,"green",["PENDING_CONFIG","PENDING_PAYMENT","PAID_QUEUE","RESERVED","SUBMITTED","READY_FOR_PICKUP","COMPLETED"]),
    ("Print attempt",660,"gray",["PREPARED","SUBMITTING","SUBMITTED","CONFIRMED","FAILED / UNKNOWN"]),
]
for group,y,color,states in groups:
    p.text(group,group,40,y-30,300,26,15,True)
    for i,s in enumerate(states):
        p.node(f"{group}-{i}",s,40+i*180,y,w=150,h=60,color=color)
    last_main = len(states)-1 if group=="Print job" else len(states)-2
    for i in range(last_main): p.edge(f"{group}-{i}",f"{group}-{i+1}")
    if group=="Document": p.edge("Document-1","Document-3","invalid","red")
    if group=="Payment attempt": p.edge("Payment attempt-1","Payment attempt-3","confirmed failure","red")
    if group=="Print attempt": p.edge("Print attempt-1","Print attempt-4","failure / ambiguity","red")
p.node("payment-unknown","UNKNOWN<br>Query same reference;<br>do not recharge",760,300,w=200,color="red")
p.edge("Payment attempt-1","payment-unknown","timeout","red")
p.text("rules", "<b>Recovery rules</b><br>• Payment UNKNOWN → SUCCEEDED / FAILED only after provider evidence. A timeout does not release the charge lock.<br>• Print UNKNOWN → staff review of OS queue and paper. A reprint is a new, audited attempt, explicitly authorized.<br>• Device reservations never expire into automatic reassignment while offline printing is possible.<br>• Reassignment / refund requires quiescing the original device and resolving its pending print attempts.<br>• Unpaid jobs may expire or be cancelled. Paid exceptions enter FULFILMENT_REVIEW; money remains recorded separately.<br>• REFUND_PENDING / REFUNDED are refund records, not a reversal of a successful payment record.",40,810,1250,185)

p = Page("04 Data model", "CloudPrint CM / Core data model",
         "Logical entities, not final migrations • 1 → many connectors • amounts are integer XAF", 1420, 1140)
entities = [
    ("shops","PrintShops","id (PK)<br>name, location, timezone<br>accepting_jobs, last_seen_at<br>pricing_version",40,130,"blue"),
    ("members","ShopMemberships","id (PK), shop_id (FK)<br>staff_user_id, role<br>revoked_at",40,420,"blue"),
    ("devices","ShopDevices","id (PK), shop_id (FK)<br>credential_hash, revoked_at<br>last_seen_at, capabilities",40,710,"green"),
    ("jobs","PrintJobs","id (PK), shop_id (FK)<br>document_id (FK), user_phone<br>copies, colour_mode, status<br>quote_snapshot, total_xaf<br>ticket_code, version<br>reserved_device_id (FK)",400,130,"blue"),
    ("payments","PaymentAttempts","id (PK), job_id (FK)<br>provider, merchant_reference<br>gateway_reference, status<br>payer_phone, amount_xaf<br>currency, idempotency_key",760,130,"orange"),
    ("documents","Documents","id (PK), processing_status<br>source_key, prepared_pdf_key<br>size_bytes, sha256, page_count<br>validation_error, retain_until",400,420,"blue"),
    ("attempts","PrintAttempts","id (PK), job_id (FK)<br>device_id (FK), printer_id<br>status, spooler_job_id<br>command_id, reprint_reason<br>created_at, confirmed_at",400,710,"green"),
    ("refunds","Refunds","id (PK), payment_attempt_id (FK)<br>amount_xaf, status, reason<br>provider_reference<br>idempotency_key",1120,130,"orange"),
    ("inbox","InboundEvents","id (PK), source, external_id<br>verified_at, processed_at<br>encrypted_or_redacted_payload<br>UNIQUE(source, external_id)",760,420,"orange"),
    ("outbox","OutboxEvents","id (PK), shop_id (FK)<br>aggregate_id, aggregate_version<br>type, payload, created_at<br>delivery_attempts, delivered_at",760,710,"blue"),
    ("sessions","ConversationSessions","id (PK), sender_id<br>active_job_id, step, version<br>expires_at<br>Explicit switch between jobs",1120,420,"gray"),
    ("audit","AuditEvents","id (PK), shop_id (FK)<br>actor_id, device_id, job_id<br>action, reason, occurred_at<br>Append-only history",1120,710,"gray"),
]
for id,title,body,x,y,c in entities:
    p.node(id,f"<b>{title}</b><hr>{body}",x,y,w=260,h=200,color=c,extra="align=left;verticalAlign=top;spacing=12;fontSize=13;")
for a,b in [("shops","jobs"),("shops","members"),("shops","devices"),("documents","jobs"),("jobs","payments"),("payments","refunds"),("jobs","attempts"),("devices","attempts")]: p.edge(a,b,er=True)
p.text("constraints", "<b>Database invariants:</b> one unresolved payment attempt per job; unique provider references; unique command IDs;<br>one active device reservation per job; positive copies; nonnegative integer amounts; optimistic job version checks.<br><b>Tickets:</b> short human-readable code, unique within the shop's active ticket window. Never a file-access credential.<br><b>Local SQLite:</b> job cache, device reservation, print-attempt journal, pending commands, and sync cursor; credentials live in OS secure storage.",40,990,1320,105)

p = Page("05 Deployment and trust", "CloudPrint CM / Deployment and trust boundaries",
         "A small initial deployment with durable state, isolated conversion, and outbound shop connectivity.", 1360, 1040)
p.container("public","PUBLIC NETWORK",40,120,1260,170,"gray")
p.node("wa","WhatsApp network",30,55,parent="public",color="gray")
p.node("agg","Payment provider<br>MTN / Orange",390,55,parent="public",color="orange")
p.node("pc","Shop computer<br>Flutter printer host",930,55,parent="public",color="green")
p.container("vps","VPS / only HTTPS ingress exposed publicly",40,350,900,570,"blue")
p.node("tls","TLS reverse proxy<br>Rate + body limits",390,40,parent="vps")
p.node("wa-runtime","Gateway process<br>Baileys credentials<br>Single session owner",30,190,parent="vps")
p.node("api-runtime","API process<br>REST + Socket.IO<br>Authentication",390,190,parent="vps")
p.node("worker-runtime","Worker process<br>Outbox + BullMQ<br>Reconcile + notices",660,190,parent="vps")
p.node("pg","PostgreSQL volume<br>Jobs + money<br>Inbox + outbox",210,390,parent="vps",extra="shape=cylinder3;")
p.node("redis","Redis volume<br>AOF + noeviction<br>Rebuild from outbox",660,390,parent="vps",extra="shape=cylinder3;",color="orange")
p.container("isolation","DOCUMENT WORKER SANDBOX",990,350,310,570,"orange")
p.node("converter","PDF validation<br>DOCX → PDF<br>Resource limits",85,190,parent="isolation",color="orange")
p.node("storage","Private document<br>volume; quarantine<br>and prepared PDFs",85,390,parent="isolation",extra="shape=cylinder3;",color="orange")
for a,b,l in [("wa","wa-runtime","outbound session"),("agg","tls","HTTPS callback"),("pc","tls","outbound TLS"),("tls","api-runtime","route"),("api-runtime","pg","transactions"),("wa-runtime","pg","inbox / core"),("worker-runtime","pg","outbox / state"),("worker-runtime","redis","tasks"),("worker-runtime","converter","bounded work"),("converter","storage","prepare")]: p.edge(a,b,l)
p.text("ops", "<b>Operations:</b> encrypted off-host backups of database + documents + session material; restore drills; failed-task review.<br><b>Isolation:</b> converter has no payment credentials or general network access. Quarantine is never publicly served.<br><b>Observability:</b> correlate job / payment / attempt IDs; redact phone numbers and document contents; alert on stalled queues and sessions.<br><b>Initial limits:</b> single VPS is a failure domain. Scale workers independently before adding multiple API or gateway instances.",40,940,1260,90)

OUT.parent.mkdir(parents=True, exist_ok=True)
ET.indent(document, space="  ")
ET.ElementTree(document).write(OUT, encoding="utf-8", xml_declaration=True)
print(OUT)
