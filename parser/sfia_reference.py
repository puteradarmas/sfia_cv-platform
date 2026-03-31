"""
SFIA v9 Reference Data
  - SFIA_SKILLS: subset of SFIA v9 skill codes, names, categories, and match keywords
  - SFIA_LEVEL_HYPOTHESES: zero-shot NLI templates for level estimation (1–7)

Extend SFIA_SKILLS with the full 102-skill list from sfia-online.org as needed.
"""

# ── Level Hypotheses (used by NLI zero-shot classification) ───────
SFIA_LEVEL_HYPOTHESES = {
    1: "This person has basic awareness of {skill} and works under close supervision with no autonomy",
    2: "This person applies {skill} in routine, familiar tasks following established procedures with some supervision",
    3: "This person uses {skill} independently across a range of situations and is familiar with standard methodologies",
    4: "This person applies {skill} in complex situations, adapts approaches, and may guide or supervise others",
    5: "This person has broad and deep {skill} expertise, advises others, and is accountable for team-level outcomes",
    6: "This person has authoritative {skill} knowledge, influences organisational strategy, and shapes policies",
    7: "This person is a globally recognised authority in {skill} who sets direction at industry or international level",
}

# ── SFIA v9 Skill Reference (representative subset — extend as needed) ─────
SFIA_SKILLS = [
    # ── Development & Implementation ─────────────────────────────
    {"code": "PROG", "name": "Programming",            "category": "Development and Implementation", "keywords": ["programming", "coding", "software development", "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#", "php", "ruby"]},
    {"code": "SWDN", "name": "Software Design",        "category": "Development and Implementation", "keywords": ["software design", "system design", "architecture", "design patterns", "microservices", "api design"]},
    {"code": "DBDS", "name": "Database Design",        "category": "Development and Implementation", "keywords": ["database design", "data modelling", "erd", "schema design", "sql", "relational database"]},
    {"code": "TEST", "name": "Testing",                "category": "Development and Implementation", "keywords": ["testing", "qa", "quality assurance", "unit test", "integration test", "pytest", "selenium"]},
    {"code": "DESN", "name": "Systems Design",         "category": "Development and Implementation", "keywords": ["systems design", "solution design", "technical design", "system architecture"]},

    # ── Data & Analytics ─────────────────────────────────────────
    {"code": "DENG", "name": "Data Engineering",       "category": "Data and Analytics",            "keywords": ["data engineering", "etl", "elt", "pipeline", "airflow", "spark", "kafka", "data pipeline", "data warehouse", "medallion", "dbt"]},
    {"code": "DTAN", "name": "Data Science",           "category": "Data and Analytics",            "keywords": ["data science", "machine learning", "ml", "deep learning", "statistics", "sklearn", "tensorflow", "pytorch", "nlp", "data analysis", "pandas", "numpy"]},
    {"code": "BINT", "name": "Business Intelligence",  "category": "Data and Analytics",            "keywords": ["business intelligence", "bi", "power bi", "tableau", "looker", "dashboard", "reporting", "analytics"]},
    {"code": "DMAN", "name": "Data Management",        "category": "Data and Analytics",            "keywords": ["data management", "master data", "mdm", "data quality", "data stewardship"]},
    {"code": "DGOV", "name": "Data Governance",        "category": "Data and Analytics",            "keywords": ["data governance", "data policy", "data standards", "satu data", "metadata management", "data catalog"]},

    # ── IT Management & Enterprise Architecture ───────────────────
    {"code": "ITSP", "name": "IT Strategy & Planning", "category": "IT Governance and Management",  "keywords": ["it strategy", "technology roadmap", "digital transformation", "strategic planning"]},
    {"code": "ITMG", "name": "IT Management",          "category": "IT Governance and Management",  "keywords": ["it management", "service delivery", "it operations", "vendor management"]},
    {"code": "EAPL", "name": "Enterprise Architecture","category": "IT Governance and Management",  "keywords": ["enterprise architecture", "ea", "togaf", "zachman", "business architecture", "solution architecture"]},
    {"code": "GOVN", "name": "IT Governance",          "category": "IT Governance and Management",  "keywords": ["it governance", "cobit", "itil", "compliance", "audit", "risk management"]},

    # ── Security ─────────────────────────────────────────────────
    {"code": "SCAD", "name": "Security Architecture",  "category": "Security",                      "keywords": ["security architecture", "cybersecurity", "zero trust", "security design", "cissp", "cloud security"]},
    {"code": "INAS", "name": "Information Assurance",  "category": "Security",                      "keywords": ["information assurance", "information security", "iso 27001", "nist", "data protection", "privacy"]},
    {"code": "VULN", "name": "Vulnerability Management","category": "Security",                     "keywords": ["vulnerability management", "penetration testing", "pen test", "soc", "siem", "threat intelligence"]},

    # ── Infrastructure & Cloud ────────────────────────────────────
    {"code": "COUD", "name": "Cloud Engineering",      "category": "Infrastructure and Cloud",      "keywords": ["cloud", "aws", "azure", "gcp", "kubernetes", "docker", "terraform", "iac", "devops", "ci/cd", "cloud engineering"]},
    {"code": "NTAS", "name": "Network Administration", "category": "Infrastructure and Cloud",      "keywords": ["network", "networking", "cisco", "firewall", "vpn", "dns", "tcp/ip", "network administration"]},
    {"code": "ITOP", "name": "IT Operations",          "category": "Infrastructure and Cloud",      "keywords": ["it operations", "sysadmin", "linux", "windows server", "monitoring", "incident management"]},

    # ── Project & Programme Management ────────────────────────────
    {"code": "PRMG", "name": "Project Management",     "category": "Delivery and Operations",       "keywords": ["project management", "pmp", "prince2", "agile", "scrum", "kanban", "waterfall", "delivery management"]},
    {"code": "POMG", "name": "Portfolio Management",   "category": "Delivery and Operations",       "keywords": ["portfolio management", "programme management", "pmo", "epmo"]},

    # ── Business Change ───────────────────────────────────────────
    {"code": "BUAN", "name": "Business Analysis",      "category": "Business Change",               "keywords": ["business analysis", "requirements", "brd", "use case", "stakeholder", "process mapping", "business analyst"]},
    {"code": "CHMG", "name": "Change Management",      "category": "Business Change",               "keywords": ["change management", "organisational change", "transformation", "adoption"]},

    # ── Procurement & Relationships ───────────────────────────────
    {"code": "RLMT", "name": "Stakeholder Management", "category": "Relationships and Engagement",  "keywords": ["stakeholder management", "stakeholder engagement", "communication", "relationship management"]},
]
