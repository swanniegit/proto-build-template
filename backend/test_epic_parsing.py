#!/usr/bin/env python3
"""Test epic parsing with the exact content format"""

import sys
import re
sys.path.append('.')

def test_epic_parsing():
    content = """**Deliverables:**
1. **Epic 1: Motor Insurance Product Development**
- **Objective:** Develop a comprehensive motor insurance product tailored for the South African market.
- **Components:**
- Feature design for coverage options (e.g., comprehensive, third-party).
- Integration with SA banking systems for premium payments.
- FSCA compliance checks and documentation.
- **Success Criteria:** Product meets market needs and regulatory standards, with seamless banking integration.
2. **Epic 2: Household Insurance Product Development**
- **Objective:** Create a household insurance product that addresses common risks in South Africa.
- **Components:**
- Coverage for property damage, theft, and natural disasters.
- User-friendly claims process.
- FSCA compliance and risk assessment protocols.
- **Success Criteria:** High customer satisfaction and adherence to FSCA guidelines.
3. **Epic 3: Travel Insurance Product Development**
- **Objective:** Launch a travel insurance product that caters to both domestic and international travel.
- **Components:**
- Coverage for medical emergencies, trip cancellations, and lost luggage.
- Integration with travel booking systems.
- FSCA compliance and international regulatory considerations.
- **Success Criteria:** Competitive product offering with minimal claims processing time.
4. **Epic 4: Business Insurance Product Development**
- **Objective:** Develop a business insurance product for small to medium enterprises in South Africa.
- **Components:**
- Coverage for liability, property damage, and business interruption.
- Customizable options for different industries.
- FSCA compliance and industry-specific risk assessments.
- **Success Criteria:** Product scalability and alignment with business needs.
5. **Epic 5: FSCA Compliance Framework**
- **Objective:** Establish a framework to ensure all insurance products comply with FSCA regulations.
- **Components:**
- Regular audits and compliance checks.
- Training for cross-functional teams on regulatory updates.
- **Success Criteria:** Zero compliance breaches and timely updates to regulatory changes."""

    epics = []
    lines = content.split('\n')
    current_epic = None
    
    for line in lines:
        line = line.strip()
        print(f"Processing line: '{line}'")
        
        # Look for Epic patterns
        epic_match = re.match(r'(?:\d+\.\s*)?\*\*Epic\s*(\d+):\s*([^*]+)\*\*', line)
        if epic_match:
            if current_epic:
                epics.append(current_epic)
            
            epic_num = epic_match.group(1)
            title = epic_match.group(2).strip()
            current_epic = {
                "title": f"Epic {epic_num}: {title}",
                "description": "",
                "business_value": "High",
                "complexity": "medium"
            }
            print(f"Found epic: {current_epic['title']}")
        
        # Look for objective
        elif current_epic and ('**Objective:**' in line or '- **Objective:**' in line):
            objective = line.replace('**Objective:**', '').replace('- **Objective:**', '').strip()
            current_epic["description"] = objective
            print(f"Found objective: {objective}")
    
    # Add the last epic
    if current_epic:
        epics.append(current_epic)
    
    print(f"\nExtracted {len(epics)} epics:")
    for i, epic in enumerate(epics):
        print(f"{i+1}. {epic['title']}")
        print(f"   Description: {epic['description']}")
    
    return epics

if __name__ == "__main__":
    test_epic_parsing()