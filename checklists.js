// VR/AR Compliance Checklists - extracted from evaluate_checklist.py
// These are the official checklists used for high-risk and low-risk applications

const COMPLIANCE_CHECKLISTS = {
    high: {
        name: 'High Risk AI/VR Compliance Checklist',
        items: [
            { id: '1.1', text: 'Are all data types collected clearly listed (e.g., biometric, audio, behavioral)?' },
            { id: '1.2', text: 'Are the data sources explained (user-provided, device sensors, third parties)?' },
            { id: '1.3', text: 'Are sensitive data (e.g., biometric) distinguished from regular data?' },
            { id: '1.4', text: 'Does the policy commit to data minimisation (collecting only what is necessary)?' },
            { id: '1.5', text: 'Does the policy mention anonymisation or de-identification where possible?' },
            { id: '2.1', text: 'Are data usage purposes stated clearly and specifically?' },
            { id: '2.2', text: 'If used for automated decision-making, is this explicitly stated?' },
            { id: '2.3', text: 'Does the policy allow users to request an explanation for automated decisions?' },
            { id: '3.1', text: 'Is the legal basis for data processing provided (e.g., consent, contract)?' },
            { id: '3.2', text: 'Does the policy explicitly state compliance with relevant laws/regulations (e.g., GDPR, CCPA, AI Act)?' },
            { id: '4.1', text: 'Are users informed how their data is used in the AI system?' },
            { id: '4.2', text: 'Are user rights (access, correction, deletion, objection) explained?' },
            { id: '4.3', text: 'Can users opt out of fully automated decisions?' },
            { id: '4.4', text: 'Does the policy commit to keeping user data accurate and up-to-date?' },
            { id: '5.1', text: 'Is the data retention period or policy clearly stated?' },
            { id: '5.2', text: 'Are users informed of their "Right to be Forgotten" and how to request deletion?' },
            { id: '6.1', text: 'Is a contact point (e.g., Data Protection Officer) provided?' },
            { id: '6.2', text: 'Does the policy identify the organisation(s) responsible for data processing (Data Controller/Processor)?' },
            { id: '6.3', text: 'Does the policy describe a complaint or redress mechanism (e.g., filing with a regulator)?' },
            { id: '6.4', text: 'If sensitive information is involved, does the policy confirm express consent was obtained and explain how consent can be withdrawn?' }
        ]
    },
    low: {
        name: 'Standard VR/AR Compliance Checklist',
        items: [
            { id: '1.1', text: 'Are all data types collected clearly listed (e.g., biometric, audio, behavioral)?' },
            { id: '1.2', text: 'Are the data sources explained (user-provided, device sensors, third parties)?' },
            { id: '1.3', text: 'Are sensitive data (e.g., biometric) distinguished from regular data?' },
            { id: '1.4', text: 'Does the policy commit to data minimisation (collecting only what is necessary)?' },
            { id: '1.5', text: 'Does the policy mention anonymisation or de-identification where possible?' },
            { id: '2.1', text: 'Are data usage purposes stated clearly and specifically?' },
            { id: '3.1', text: 'Is the legal basis for data processing provided (e.g., consent, contract)?' },
            { id: '3.2', text: 'Does the policy explicitly state compliance with relevant laws/regulations (e.g., GDPR, CCPA, AI Act)?' },
            { id: '4.1', text: 'Are users informed how their data is used in the AI system?' },
            { id: '4.2', text: 'Are user rights (access, correction, deletion, objection) explained?' },
            { id: '4.4', text: 'Does the policy commit to keeping user data accurate and up-to-date?' },
            { id: '5.1', text: 'Is the data retention period or policy clearly stated?' },
            { id: '5.2', text: 'Are users informed of their "Right to be Forgotten" and how to request deletion?' },
            { id: '6.1', text: 'Is a contact point (e.g., Data Protection Officer) provided?' },
            { id: '6.2', text: 'Does the policy identify the organisation(s) responsible for data processing (Data Controller/Processor)?' },
            { id: '6.3', text: 'Does the policy describe a complaint or redress mechanism (e.g., filing with a regulator)?' },
            { id: '6.4', text: 'If sensitive information is involved, does the policy confirm express consent was obtained and explain how consent can be withdrawn?' }
        ]
    }
};