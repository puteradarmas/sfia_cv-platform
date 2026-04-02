import type { Candidate, SFIASkillDefinition } from '../types/types'

export const mockCandidates: Candidate[] = [
  {
    id: 'c001',
    name: 'Andi Pratama',
    email: 'andi.pratama@email.com',
    role: 'Data Engineer',
    uploadedAt: '2026-04-01T08:30:00Z',
    status: 'pending',
    cvText: 'Experienced data engineer with 5 years in building ETL pipelines, data warehouses, and analytics platforms in the banking and government sector. Proficient in Python, SQL, Apache Spark, and dbt. Led migration of legacy data systems to cloud-native architecture.',
    skills: [
      { id: 's1', code: 'DTAN', name: 'Data Analytics', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', level: 4, confidence: 0.91, source: 'parsed' },
      { id: 's2', code: 'DENG', name: 'Data Engineering', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', level: 5, confidence: 0.95, source: 'parsed' },
      { id: 's3', code: 'DBAD', name: 'Database Administration', category: 'Data and Analytics', subcategory: 'Database Management', level: 3, confidence: 0.78, source: 'parsed' },
      { id: 's4', code: 'ARCH', name: 'Solution Architecture', category: 'IT Management', subcategory: 'Enterprise and Solution Architecture', level: 3, confidence: 0.62, source: 'parsed' },
    ]
  },
  {
    id: 'c002',
    name: 'Sari Dewi',
    email: 'sari.dewi@email.com',
    role: 'Security Analyst',
    uploadedAt: '2026-04-01T09:15:00Z',
    status: 'validated',
    cvText: 'Information security professional with expertise in vulnerability assessment, incident response, and security architecture. Holds CISSP and CompTIA Security+ certifications. 7 years experience in financial services sector.',
    skills: [
      { id: 's5', code: 'INAS', name: 'Information Assurance', category: 'Security and Privacy', subcategory: 'Information Security', level: 5, confidence: 0.93, source: 'parsed' },
      { id: 's6', code: 'VUAS', name: 'Vulnerability Assessment', category: 'Security and Privacy', subcategory: 'Cybersecurity', level: 4, confidence: 0.88, source: 'parsed' },
      { id: 's7', code: 'SCAD', name: 'Security Administration', category: 'Security and Privacy', subcategory: 'Cybersecurity', level: 4, confidence: 0.82, source: 'parsed' },
      { id: 's8', code: 'IRMG', name: 'Information Security Management', category: 'Security and Privacy', subcategory: 'Information Security', level: 5, confidence: 0.79, source: 'parsed' },
    ]
  },
  {
    id: 'c003',
    name: 'Budi Santoso',
    email: 'budi.santoso@email.com',
    role: 'Enterprise Architect',
    uploadedAt: '2026-04-01T10:00:00Z',
    status: 'pending',
    cvText: 'Senior enterprise architect with 10+ years designing large-scale government IT systems. Expert in TOGAF, Zachman framework, and Indonesian SPBE compliance. Led enterprise architecture for multiple ministries.',
    skills: [
      { id: 's9', code: 'STPL', name: 'Strategic Planning', category: 'IT Management', subcategory: 'IT Governance', level: 6, confidence: 0.87, source: 'parsed' },
      { id: 's10', code: 'ARCH', name: 'Solution Architecture', category: 'IT Management', subcategory: 'Enterprise and Solution Architecture', level: 6, confidence: 0.94, source: 'parsed' },
      { id: 's11', code: 'GOVN', name: 'IT Governance', category: 'IT Management', subcategory: 'IT Governance', level: 6, confidence: 0.81, source: 'parsed' },
      { id: 's12', code: 'NTDS', name: 'Network Design', category: 'Infrastructure and Operations', subcategory: 'Network Management', level: 3, confidence: 0.45, source: 'parsed' },
    ]
  },
  {
    id: 'c004',
    name: 'Maya Kusuma',
    email: 'maya.kusuma@email.com',
    role: 'ML Engineer',
    uploadedAt: '2026-04-01T11:30:00Z',
    status: 'rejected',
    cvText: 'Machine learning engineer specialising in NLP and computer vision. Built production ML pipelines using PyTorch and HuggingFace. Experience in model fine-tuning, RLHF, and deployment on GPU clusters.',
    skills: [
      { id: 's13', code: 'MLNG', name: 'Machine Learning Engineering', category: 'Data and Analytics', subcategory: 'Data Science', level: 5, confidence: 0.96, source: 'parsed' },
      { id: 's14', code: 'DTAN', name: 'Data Analytics', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', level: 4, confidence: 0.72, source: 'parsed' },
      { id: 's15', code: 'SWDN', name: 'Software Development', category: 'Software Development', subcategory: 'Systems Development', level: 4, confidence: 0.83, source: 'parsed' },
    ]
  },
  {
    id: 'c005',
    name: 'Rizky Hakim',
    email: 'rizky.hakim@email.com',
    role: 'Cloud Architect',
    uploadedAt: '2026-04-02T07:45:00Z',
    status: 'pending',
    cvText: 'Cloud architect with AWS and Azure certifications. Designed multi-cloud infrastructure for oil and gas digital transformation projects. Expertise in IaC, DevSecOps, and cloud-native application architecture.',
    skills: [
      { id: 's16', code: 'CLMG', name: 'Cloud Management', category: 'Infrastructure and Operations', subcategory: 'Cloud Services', level: 5, confidence: 0.92, source: 'parsed' },
      { id: 's17', code: 'ARCH', name: 'Solution Architecture', category: 'IT Management', subcategory: 'Enterprise and Solution Architecture', level: 5, confidence: 0.89, source: 'parsed' },
      { id: 's18', code: 'DOPS', name: 'DevOps', category: 'Software Development', subcategory: 'Systems Development', level: 4, confidence: 0.77, source: 'parsed' },
    ]
  }
]

export const sfiaSkillDefinitions: SFIASkillDefinition[] = [
  { code: 'DTAN', name: 'Data Analytics', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', description: 'The application of mathematics, statistics, predictive modelling and machine-learning techniques to discover meaningful patterns and knowledge in recorded facts.', levels: [] },
  { code: 'DENG', name: 'Data Engineering', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', description: 'Designing, building, operationalising, securing and monitoring data pipelines and data stores.', levels: [] },
  { code: 'DBAD', name: 'Database Administration', category: 'Data and Analytics', subcategory: 'Database Management', description: 'Installing, configuring, upgrading, administrating, monitoring and maintaining databases.', levels: [] },
  { code: 'ARCH', name: 'Solution Architecture', category: 'IT Management', subcategory: 'Enterprise and Solution Architecture', description: 'Developing and communicating a multi-dimensional solution architecture to fulfil agreed system requirements.', levels: [] },
  { code: 'INAS', name: 'Information Assurance', category: 'Security and Privacy', subcategory: 'Information Security', description: 'Protection of integrity, availability, authenticity, non-repudiation and confidentiality of information and data in storage and in transit.', levels: [] },
  { code: 'VUAS', name: 'Vulnerability Assessment', category: 'Security and Privacy', subcategory: 'Cybersecurity', description: 'Identification and prioritisation of vulnerabilities in information systems and the actions needed to address them.', levels: [] },
  { code: 'SCAD', name: 'Security Administration', category: 'Security and Privacy', subcategory: 'Cybersecurity', description: 'Provision and operation of a secure information processing environment.', levels: [] },
  { code: 'IRMG', name: 'Information Security Management', category: 'Security and Privacy', subcategory: 'Information Security', description: 'Directing and ensuring the effective implementation and operation of information security controls and management processes.', levels: [] },
  { code: 'STPL', name: 'Strategic Planning', category: 'IT Management', subcategory: 'IT Governance', description: 'Creating and maintaining strategies to guide and direct the organisation.', levels: [] },
  { code: 'GOVN', name: 'IT Governance', category: 'IT Management', subcategory: 'IT Governance', description: 'Establishing and operating a framework to give assurance on risk, compliance and performance of the organisation and its IT capability.', levels: [] },
  { code: 'NTDS', name: 'Network Design', category: 'Infrastructure and Operations', subcategory: 'Network Management', description: 'Designing communication networks and services, using technical knowledge and understanding of business needs.', levels: [] },
  { code: 'MLNG', name: 'Machine Learning Engineering', category: 'Data and Analytics', subcategory: 'Data Science', description: 'Applying machine learning techniques, tools and processes to implement production-grade ML systems.', levels: [] },
  { code: 'SWDN', name: 'Software Development', category: 'Software Development', subcategory: 'Systems Development', description: 'Developing software components, modules, and systems that meet specified requirements.', levels: [] },
  { code: 'CLMG', name: 'Cloud Management', category: 'Infrastructure and Operations', subcategory: 'Cloud Services', description: 'Planning, implementing and optimising the use of cloud services to meet the needs of the organisation.', levels: [] },
  { code: 'DOPS', name: 'DevOps', category: 'Software Development', subcategory: 'Systems Development', description: 'Combining software development and IT operations to shorten the systems development life cycle.', levels: [] },
  { code: 'DGFS', name: 'Data Governance', category: 'Data and Analytics', subcategory: 'Data and Analytics Management', description: 'Developing and operating a framework for the ownership, management, use and exploitation of data assets.', levels: [] },
  { code: 'PRMG', name: 'Project Management', category: 'Business Change', subcategory: 'Project Management', description: 'Delivering business value by enabling change within agreed time, cost and quality parameters.', levels: [] },
  { code: 'BUAN', name: 'Business Analysis', category: 'Business Change', subcategory: 'Business Analysis', description: 'Investigating business situations and recommending improvements to business systems and processes.', levels: [] },
  { code: 'TEST', name: 'Testing', category: 'Software Development', subcategory: 'Systems Development', description: 'Investigating products, systems and services to assess behaviour and whether it meets specified requirements.', levels: [] },
  { code: 'USEV', name: 'User Experience Evaluation', category: 'Human Factors', subcategory: 'User Experience', description: 'Validating systems, products and services against user experience goals, metrics and targets.', levels: [] },
  { code: 'RLMT', name: 'Release and Deployment Management', category: 'Infrastructure and Operations', subcategory: 'IT Operations', description: 'Controlling the movement of releases to the live environment.', levels: [] },
  { code: 'ITOP', name: 'IT Infrastructure Management', category: 'Infrastructure and Operations', subcategory: 'IT Operations', description: 'Managing the IT infrastructure and resources needed to deliver IT services.', levels: [] },
]
