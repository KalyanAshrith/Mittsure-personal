import { SchoolData, SchoolVisitData } from './types';

export interface AIPitchPrompt {
  school: SchoolData;
  targetProgramme: 'MOM' | 'Junior Power Quest' | 'Both';
  pastVisits?: SchoolVisitData[];
}

export interface AIObjectionPrompt {
  objection: string;
  schoolType?: string;
  board?: string;
}

export interface AIDailyAdvicePrompt {
  date: string;
  selectedSchools: SchoolData[];
  userRemarks?: string;
}

export class AIAssistantService {
  /**
   * Generates a tailored pitch for Mittsure Olympiad Masters or Junior Power Quest
   */
  public static generatePitch(prompt: AIPitchPrompt): {
    quickPitch: string;
    detailedPitch: string;
    keySellingPoints: string[];
    openingHook: string;
  } {
    const { school, targetProgramme } = prompt;
    const isPreSchool = ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI'].includes(school.school_type);
    const principalName = school.principal_name && !school.principal_name.includes('Head') ? school.principal_name : 'Respected Principal';

    if (targetProgramme === 'Junior Power Quest' || isPreSchool) {
      return {
        openingHook: `Good morning ${principalName}, I am Kalyan Ashrith from Mittsure Technologies. We work closely with premier early childhood centres across Mysuru to evaluate and celebrate early learning milestones without exam stress.`,
        quickPitch: `Junior Power Quest is an NEP-aligned holistic diagnostic talent assessment specifically designed for Nursery, LKG, and UKG students. It evaluates cognitive, linguistic, and sensory development through fun pictorial challenges. Every child receives a colorful Holistic Progress Passport, medal, and certificate, elevating your institution's early childhood reputation with parents.`,
        detailedPitch: `Respected ${principalName}, early childhood education under the National Education Policy emphasizes the Panchakosha framework — physical, vital, mental, intellectual, and joyful development.
Mittsure's Junior Power Quest provides:
1. Zero teacher burden: We provide complete activity kits and handle evaluation.
2. Digital Holistic Progress Passport: Detailed milestone insights that delight modern parents during parent-teacher meetings.
3. Every student receives a participation medal, certificate of achievement, and MittStore voucher.
4. School Recognition: Host institutions receive the 'Mittsure Early Childhood Centre of Excellence' citation.
We propose a 20-minute discussion to schedule a trial demonstration batch for your upcoming term.`,
        keySellingPoints: [
          'NEP & Panchakosha holistic developmental framework',
          'Zero stress: pictorial and activity-driven talent discovery',
          'Every child receives a medal, certificate, and parent report',
          'Completely teacher-friendly with Mittsure end-to-end evaluation',
        ],
      };
    }

    if (targetProgramme === 'MOM') {
      return {
        openingHook: `Good morning ${principalName}, I am Kalyan Ashrith from Mittsure Technologies. In ${school.area}, schools like yours are aiming to boost competitive excellence alongside board exams.`,
        quickPitch: `Mittsure Olympiad Masters (MOM) is India's most comprehensive academic & cognitive talent quest for Classes 1–12 across Science, Math, English, and Cyber. Unlike traditional tests that only rank students, MOM delivers individualized diagnostic skill reports and ₹500 MittStore learning vouchers to every single registered student.`,
        detailedPitch: `Respected ${principalName}, with academic rigor becoming central for both CBSE and State Board examinations in Mysuru, students need diagnostic benchmarks rather than simple pass/fail metrics.
What sets Mittsure Olympiad Masters apart:
1. Student Tangibles: Every participant receives comprehensive practice workbooks, national ranking, diagnostic gap analysis, and a ₹500 digital learning voucher.
2. Grand Prizes: National toppers receive cash scholarships up to ₹50,000, tablets, and gold medals.
3. School Benefits: Your institution receives institutional performance analytics benchmarked against top Mysuru and Karnataka institutions, plus a prestigious School Excellence Trophy.
4. Affordable Entry: Nominal fee of ₹150 with complete practice material included.
May we review the registration starter kit and select exam dates suitable for your academic calendar?`,
        keySellingPoints: [
          'Diagnostic skill gap analysis for every participant',
          'Guaranteed ₹500 MittStore learning vouchers for all students',
          'Prestigious cash scholarships, smart tablets, and national trophies',
          'Seamless coordination with zero administrative load on school staff',
        ],
      };
    }

    // Both Programmes
    return {
      openingHook: `Good morning ${principalName}, I am Kalyan Ashrith representing Mittsure Technologies Mysuru. We provide an integrated educational ecosystem covering early foundation up to secondary excellence.`,
      quickPitch: `We offer a dual-track academic solution for ${school.school_name}: Junior Power Quest for your pre-primary section (Nursery, LKG, UKG) and Mittsure Olympiad Masters (MOM) for Classes 1 through 10. This gives your school complete K-10 diagnostic benchmarking and student rewards under one trusted brand.`,
      detailedPitch: `Respected ${principalName}, managing multiple vendors for early years activities and senior Olympiads often creates scheduling headaches.
With Mittsure:
1. Pre-Primary (Nursery–UKG): Junior Power Quest delivers stress-free Panchakosha assessment, milestone passports, and medals.
2. Primary & High School (Classes 1–10): Mittsure Olympiad Masters delivers national benchmarking, ₹500 MittStore vouchers, and grand scholarships.
3. Unified Administration: One single point of contact, synchronized testing schedules, and a combined School of Academic Excellence recognition ceremony.
Let us schedule a joint presentation for your academic coordinators this week.`,
      keySellingPoints: [
        'Comprehensive K-10 solution under one reliable partner',
        'Holistic early years progress passports + Senior national Olympiad rankings',
        'High parent satisfaction with guaranteed rewards & vouchers',
        'Dedicated Relationship Manager support right here in Mysuru',
      ],
    };
  }

  /**
   * Instant objection handling for common school administrator hesitations
   */
  public static handleObjection(prompt: AIObjectionPrompt): {
    strategy: string;
    responseScript: string;
    counterPoints: string[];
  } {
    const obj = prompt.objection.toLowerCase();

    if (obj.includes('sof') || obj.includes('silverzone') || obj.includes('already')) {
      return {
        strategy: 'Value Differentiation & Non-Exclusive Synergy',
        responseScript: `"We hold SOF in high regard, and many top schools we partner with also participate in multiple academic initiatives.
However, what principals love about Mittsure is that MOM doesn't just rank top scorers — every participating child receives a ₹500 MittStore voucher and an individualized diagnostic skill report identifying their conceptual strengths and improvement areas.
It acts as a genuine diagnostic assessment rather than just a competition. We can schedule our test dates to complement your existing schedule."`,
        counterPoints: [
          'MOM guarantees direct value back to every single participant (₹500 voucher).',
          'Provides granular skill-gap diagnosis, not just raw rank.',
          'Flexible scheduling does not conflict with term examinations.',
        ],
      };
    }

    if (obj.includes('budget') || obj.includes('fee') || obj.includes('cost') || obj.includes('expensive')) {
      return {
        strategy: 'Return On Investment & High Value Perception',
        responseScript: `"I completely understand budget sensitivity, especially in our local communities.
That is precisely why Mittsure's registration fee is set at just ₹150, which includes the printed preparation booklet and tests. Even better, each student instantly receives a ₹500 MittStore learning voucher for digital resources and study kits.
Parents immediately see that they receive over 3x the value in verified learning material. For economically disadvantaged students, we can also discuss institutional fee concessions."`,
        counterPoints: [
          'Accessible ₹150 registration fee includes official study book.',
          '₹500 guaranteed MittStore voucher exceeds the participation fee.',
          'High parental appreciation with zero financial strain on school management.',
        ],
      };
    }

    if (obj.includes('not available') || obj.includes('busy') || obj.includes('later') || obj.includes('trustee')) {
      return {
        strategy: 'Respectful Gatekeeper Navigation & Confirmed Next Step',
        responseScript: `"I completely appreciate that the Principal/Trustee has a demanding schedule managing school operations.
I have left the official curriculum overview and sample student progress booklet with your desk. May I confirm the Principal's preferred visiting hour on Thursday — typically morning between 10:30 AM to 12:00 PM, or after 2:30 PM?
I will make a brief 10-minute return visit then."`,
        counterPoints: [
          'Leave high-quality printed sample collateral with admin/gatekeeper.',
          'Log phone number and schedule confirmed follow-up in CRM.',
          'Target mid-morning (10:30 AM – 12:30 PM) window.',
        ],
      };
    }

    // Generic objection fallback
    return {
      strategy: 'Needs Assessment & Low-Risk Pilot Proposal',
      responseScript: `"We understand that any new educational collaboration requires thorough evaluation by your academic committee.
Why not conduct a pilot trial with one or two sections? There is zero financial commitment from the school, and you will directly experience the enthusiasm from students and positive feedback from parents."`,
      counterPoints: [
        'Propose an initial small-scale pilot.',
        'Offer to conduct a free orientation session for teachers.',
        'Emphasize zero administrative burden on school staff.',
      ],
    };
  }

  /**
   * Generates strategic daily route and schedule advice for the selected 7 schools
   */
  public static getDailyRouteAdvice(prompt: AIDailyAdvicePrompt): {
    summary: string;
    timingTips: string[];
    suggestedFocus: string;
    remarksDraft: string;
  } {
    const { selectedSchools, date } = prompt;
    const count = selectedSchools.length;
    const preSchoolCount = selectedSchools.filter((s) =>
      ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'MONTESSORI'].includes(s.school_type)
    ).length;
    const cbseCount = selectedSchools.filter((s) => s.board === 'CBSE').length;
    const stateCount = selectedSchools.filter((s) => s.board === 'STATE BOARD').length;

    const areas = Array.from(new Set(selectedSchools.map((s) => s.area))).join(', ');

    return {
      summary: `Day plan for ${date} covering ${count} schools across ${areas}. Optimal route clusters include ${cbseCount} CBSE, ${stateCount} State Board, and ${preSchoolCount} early education institutions.`,
      timingTips: [
        '9:30 AM – 11:30 AM: Ideal window for larger schools (CBSE / High Schools) while principals are reviewing morning administrative mail.',
        '11:45 AM – 1:15 PM: Prime window for Pre-schools and Play-schools before little learners depart for lunch.',
        '2:00 PM – 3:30 PM: Best for State Board and composite schools where management and trustees are available post-lunch.',
        'Keep travel legs under 10 minutes between clustered stops on two-wheeler.',
      ],
      suggestedFocus: preSchoolCount > 2
        ? 'High concentration of early education centres: Lead strongly with Junior Power Quest sample passports.'
        : 'Predominantly primary and high schools: Lead with Mittsure Olympiad Masters (MOM) diagnostic analytics and ₹500 student vouchers.',
      remarksDraft: `Planned ${count} school visits across ${areas} on two-wheeler. Key target: introduce ${preSchoolCount > 2 ? 'Junior Power Quest' : 'MOM & Junior Quest'} and secure at least 2 institutional registration commitments.`,
    };
  }

  /**
   * AI-Powered Parser & Matcher for user-provided marked schools lists.
   * Parses raw text, S-codes (S-XXXXX), S.Nos (#123, S.No. 412), names, and areas.
   * Deterministically resolves them against the 487 master database using multi-tier matching.
   * Identifies First Visits vs Revisits and enforces STRICT ZERO ASSUMED REGISTRATIONS.
   */
  public static parseAndMatchMarkedSchools(
    inputText: string,
    allSchools: SchoolData[],
    options: {
      defaultOutcome?: string;
      targetDate?: string;
    } = {}
  ): AIParsedVisitListResult {
    const defaultOutcome = options.defaultOutcome || 'Interested';
    const lines = inputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !/^#{1,6}\s+[a-zA-Z]/.test(l) &&
          !l.startsWith('---') &&
          !l.startsWith('| ---')
      );

    const items: AIMatchedSchoolItem[] = [];

    // Pre-build lookup indexes for rapid, exact resolution
    const bySchoolId = new Map<string, SchoolData>();
    const bySNo = new Map<number, SchoolData>();

    for (const s of allSchools) {
      if (s.school_id) bySchoolId.set(s.school_id.toUpperCase(), s);
      if (s.school_code) bySchoolId.set(s.school_code.toUpperCase(), s);
      if (s.s_no) bySNo.set(s.s_no, s);
    }

    const STOP_WORDS = new Set([
      'school',
      'schools',
      'public',
      'high',
      'primary',
      'vidyalaya',
      'vidhyalaya',
      'vidyanikethana',
      'kendra',
      'the',
      'and',
      'pre',
      'for',
      'mysuru',
      'mysore',
      'centre',
      'center',
      'education',
      'composite',
      'english',
      'medium',
      'kannada',
      'convent',
      'international',
      'academy',
      'institute',
      'institutions',
      'layout',
      'nagar',
      'stage',
      'new',
      'st',
      'saint',
    ]);

    for (const rawLine of lines) {
      // Skip header lines or pure separator lines
      if (
        /^\s*\|?\s*(S\.?No|School|Name|Planned|Type|Area|Why selected)\b/i.test(rawLine) ||
        /^(TOMORROW'S PLAN|YESTERDAY'S PLAN|COMPLETED SCHOOLS|VISITED SCHOOLS)/i.test(rawLine)
      ) {
        continue;
      }

      // 1. Extract S-Code (e.g., S-75024, S-156333)
      const sCodeMatch = rawLine.match(/\b(S-\d{4,6})\b/i);
      const extractedCode = sCodeMatch ? sCodeMatch[1].toUpperCase() : null;

      // 2. Extract S.No (e.g., S.No. 470, S.No 412, #475, leading 457, #244)
      let extractedSNo: number | null = null;
      const sNoMatch =
        rawLine.match(/(?:S\.?\s*No\.?|Sl\.?\s*No\.?|#)\s*(\d{1,3})\b/i) ||
        rawLine.match(/^\|\s*\*?\*?(\d{1,3})\*?\*?\s*\|/);
      if (sNoMatch) {
        extractedSNo = parseInt(sNoMatch[1], 10);
      } else {
        const leadingNumberMatch = rawLine.match(/^(\d{1,3})[\.\)\s\-\|]/);
        if (leadingNumberMatch) {
          extractedSNo = parseInt(leadingNumberMatch[1], 10);
        }
      }

      // 3. Extract candidate school name & area candidate
      let cleaned = rawLine
        // Remove markdown table pipes and bold markers
        .replace(/\|/g, ' ')
        .replace(/\*\*/g, '')
        // Remove S-Code
        .replace(/\bS-\d{4,6}\b/gi, '')
        // Remove S.No labels
        .replace(/(?:S\.?\s*No\.?|Sl\.?\s*No\.?|#)\s*\d{1,3}\b/gi, '')
        // Remove trailing markers like "done these above schools", "Visit", etc.
        .replace(/\b(Day\s*\d|Visit|Follow-up\s*plan|Planned\s*for|done|above schools)\b/gi, '')
        // Normalize separators
        .replace(/[—–-]/g, ' ')
        .trim();

      // Look for outcome keywords in the line
      let outcome = defaultOutcome;
      // STRICT: ONLY set Registration Confirmed if explicitly in user input
      if (/registration confirmed|registered/i.test(rawLine)) {
        outcome = 'Registration Confirmed';
      } else if (/not interested/i.test(rawLine)) {
        outcome = 'Not Interested';
      } else if (/follow[\s-]*up/i.test(rawLine)) {
        outcome = 'Follow-up Required';
      }

      let matchedSchool: SchoolData | null = null;
      let confidence = 0.0;
      let matchMethod: AIMatchedSchoolItem['matchMethod'] = 'UNMATCHED';
      let matchExplanation = '';
      const warnings: string[] = [];

      // Tier 1: Match by extracted S-Code (Highest precision)
      if (extractedCode && bySchoolId.has(extractedCode)) {
        matchedSchool = bySchoolId.get(extractedCode)!;
        confidence = 1.0;
        matchMethod = 'CODE_EXACT';
        matchExplanation = `Exact Code Match: ${extractedCode} (Allotment #${matchedSchool.s_no})`;
      }

      // Tier 1.5: If S.No is provided and school name tokens match that exact S.No school
      if (!matchedSchool && extractedSNo && bySNo.has(extractedSNo)) {
        const candidateBySNo = bySNo.get(extractedSNo)!;
        const candTokens = candidateBySNo.school_name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

        const lineTokens = cleaned
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

        const hasOverlap = candTokens.some((t) => lineTokens.includes(t));
        if (hasOverlap || candTokens.length === 0 || lineTokens.length === 0) {
          matchedSchool = candidateBySNo;
          confidence = 0.95;
          matchMethod = 'S_NO_EXACT';
          matchExplanation = `Exact Allotment S.No. Match: #${extractedSNo} ("${matchedSchool.school_name}")`;
        }
      }

      // Tier 2: Check Name + Area match against all schools
      if (!matchedSchool) {
        const lineLower = rawLine.toLowerCase();
        const cleanedTokens = cleaned
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2);

        const distinctiveTokens = cleanedTokens.filter((t) => !STOP_WORDS.has(t));

        let bestScore = 0;
        let bestCandidate: SchoolData | null = null;

        for (const s of allSchools) {
          const sNameNorm = s.school_name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
          const sAreaNorm = (s.area || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

          // Extract primary name before hyphens or commas
          const primaryName = s.school_name.split(/[-–—,]/)[0].toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ');

          const nameTokens = sNameNorm.split(/\s+/).filter((t) => t.length > 2);
          const areaTokens = sAreaNorm.split(/\s+/).filter((t) => t.length > 2);
          const sDistinctive = nameTokens.filter((t) => !STOP_WORDS.has(t));

          // Check if distinctive tokens match
          const matchedDistinctive = distinctiveTokens.filter((t) =>
            sDistinctive.some((st) => st.includes(t) || t.includes(st))
          ).length;

          // REQUIREMENT: Must match at least one distinctive name token, OR direct primary name match
          const hasPrimaryMatch = primaryName.length > 3 && lineLower.includes(primaryName);
          const distinctiveRatio = matchedDistinctive / Math.max(sDistinctive.length, 1);

          if ((matchedDistinctive === 0 || distinctiveRatio < 0.5) && !hasPrimaryMatch) {
            continue; // Cannot match on area or generic words alone; must have core institution name overlap!
          }

          let matchedTokenCount = 0;
          for (const token of cleanedTokens) {
            if (nameTokens.includes(token)) matchedTokenCount += 2;
            else if (areaTokens.includes(token)) matchedTokenCount += 1.5;
            else if (nameTokens.some((nt) => nt.startsWith(token) || token.startsWith(nt)))
              matchedTokenCount += 1;
          }

          let score = matchedTokenCount / Math.max(nameTokens.length, 1);

          if (distinctiveTokens.length > 0 && matchedDistinctive === distinctiveTokens.length) {
            score += 3.0; // All key distinctive words matched!
          } else if (matchedDistinctive > 0) {
            score += matchedDistinctive * 1.5;
          }

          // Direct phrase inclusion
          if (hasPrimaryMatch) {
            score += 3.0;
          }

          if (sAreaNorm.length > 2 && lineLower.includes(sAreaNorm)) {
            score += 1.5;
          }

          if (score > bestScore && score >= 2.0) {
            bestScore = score;
            bestCandidate = s;
          }
        }

        if (bestCandidate && bestScore >= 1.5) {
          matchedSchool = bestCandidate;
          confidence = Math.min(0.98, 0.7 + bestScore * 0.08);
          matchMethod = 'NAME_AND_AREA';
          matchExplanation = `Fuzzy Name & Area Match: "${matchedSchool.school_name}" in ${matchedSchool.area} (Allotment #${matchedSchool.s_no})`;

          if (extractedSNo && extractedSNo !== matchedSchool.s_no) {
            warnings.push(
              `User input cited S.No. ${extractedSNo}, but matched by school name & area to S.No. ${matchedSchool.s_no} ("${matchedSchool.school_name}").`
            );
          }
        }
      }

      // Tier 3: Match by S.No (if still not matched)
      if (!matchedSchool && extractedSNo && bySNo.has(extractedSNo)) {
        const candidate = bySNo.get(extractedSNo)!;
        matchedSchool = candidate;
        confidence = 0.85;
        matchMethod = 'S_NO_EXACT';
        matchExplanation = `Exact Allotment S.No. Match: #${extractedSNo} ("${matchedSchool.school_name}")`;
      }

      // Check if line explicitly flags NOT VISITED / NOT YET VISITED
      const isExplicitlyUnvisited =
        /\b(not yet visited|not visited|unvisited|pending visit|yet to visit)\b/i.test(rawLine);

      if (isExplicitlyUnvisited) {
        items.push({
          rawInput: rawLine,
          matchedSchool,
          confidence: matchedSchool ? 0.99 : 0.95,
          matchMethod: matchedSchool ? (matchMethod || 'NAME_AND_AREA') : 'UNMATCHED',
          matchExplanation: matchedSchool
            ? `Matched: ${matchedSchool.school_name} (#${matchedSchool.s_no}) — Preserved UNVISITED as explicitly specified.`
            : 'Explicitly noted as NOT YET VISITED — preserved as unvisited.',
          isRevisit: false,
          proposedVisitType: 'FIRST_VISIT',
          proposedStatus: 'NOT VISITED',
          proposedOutcome: outcome,
          shouldSkipVisit: true,
          warnings: ['Preserved strictly UNVISITED as explicitly specified by user.'],
        });
        continue;
      }

      // If unmatched, auto-extract candidate details so it can be created and marked visited
      if (!matchedSchool) {
        const candidate = AIAssistantService.extractCandidateDetailsFromLine(rawLine);
        items.push({
          rawInput: rawLine,
          matchedSchool: null,
          confidence: 0.9,
          matchMethod: 'NEW_AUTO_CREATE',
          matchExplanation: `Unmatched School: Will auto-create with next available S.No in ${candidate.area} and mark VISITED.`,
          isRevisit: false,
          proposedVisitType: 'FIRST_VISIT',
          proposedStatus: 'VISITED',
          proposedOutcome: outcome,
          newSchoolCandidate: candidate,
          warnings: warnings.length > 0 ? warnings : undefined,
        });
        continue;
      }

      // Determine visit type & status for matched school
      let isRevisit = false;
      let proposedVisitType: 'FIRST_VISIT' | 'REVISIT' = 'FIRST_VISIT';
      let proposedStatus: 'VISITED' | 'REVISITED' = 'VISITED';

      if (matchedSchool) {
        const hasBeenVisited = Boolean(
          matchedSchool.visited_by_current_user ||
            matchedSchool.visit_status === 'VISITED' ||
            matchedSchool.visit_status === 'REVISITED' ||
            (matchedSchool.visits && matchedSchool.visits.length > 0)
        );

        if (hasBeenVisited) {
          isRevisit = true;
          proposedVisitType = 'REVISIT';
          proposedStatus = 'REVISITED';
        } else {
          isRevisit = false;
          proposedVisitType = 'FIRST_VISIT';
          proposedStatus = 'VISITED';
        }
      }

      if (outcome === 'Registration Confirmed') {
        proposedStatus = 'VISITED'; // Even if registration confirmed, tracked under completed visits
      }

      items.push({
        rawInput: rawLine,
        matchedSchool,
        confidence,
        matchMethod,
        matchExplanation: matchExplanation || 'Could not reliably match school from input text.',
        isRevisit,
        proposedVisitType,
        proposedStatus,
        proposedOutcome: outcome,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }

    const matchedCount = items.filter((i) => i.matchedSchool !== null).length;
    const newSchoolsCount = items.filter((i) => i.matchedSchool === null && i.newSchoolCandidate && !i.shouldSkipVisit).length;
    const skippedCount = items.filter((i) => i.shouldSkipVisit).length;
    const itemsToMarkCount = items.filter((i) => !i.shouldSkipVisit).length;
    const unmatchedCount = items.filter((i) => i.matchedSchool === null && !i.newSchoolCandidate).length;
    const firstVisitsCount = items.filter((i) => (i.matchedSchool && !i.isRevisit) || i.newSchoolCandidate).length;
    const revisitsCount = items.filter((i) => i.matchedSchool && i.isRevisit).length;

    return {
      totalExtracted: items.length,
      matchedCount,
      unmatchedCount,
      newSchoolsCount,
      itemsToMarkCount,
      firstVisitsCount,
      revisitsCount,
      skippedCount,
      items,
    };
  }

  /**
   * Deterministically extracts school candidate fields (name, area, district, board, type)
   * from an unmatched user line for auto-creation.
   */
  public static extractCandidateDetailsFromLine(rawLine: string): {
    school_name: string;
    area: string;
    district: string;
    board: string;
    school_type: string;
    address: string;
  } {
    // 1. Remove leading numbering/bullets e.g. "1.", "12)", "- ", "* ", "#12 "
    let cleaned = rawLine
      .replace(/^[\s\d\.\)\-\*#|]+/, '')
      .replace(/\|/g, ' ')
      .replace(/\*\*/g, '')
      .replace(/\bS-\d{4,6}\b/gi, '')
      .replace(/(?:S\.?\s*No\.?|Sl\.?\s*No\.?|#)\s*\d{1,3}\b/gi, '')
      .replace(/\b(Day\s*\d|Visit|Follow-up\s*plan|Planned\s*for|done|above schools|visited)\b/gi, '')
      .replace(/[—–]/g, '-')
      .trim();

    const KNOWN_AREAS = [
      'Saraswathipuram', 'Vijayanagar', 'Bogadi', 'Gokulam', 'Hebbal', 'Jayalakshmipuram',
      'Kuvempunagar', 'Dattagalli', 'Srirampura', 'Yelawala', 'Yelavala', 'Hootagalli',
      'Hottagalli', 'Rajiv Nagar', 'Rajivgandhi Nagar', 'Nazarbad', 'Metagalli',
      'Bannimantap', 'Vontikoppal', 'CFTRI', 'Mandi Mohalla', 'Lashkar Mohalla',
      'Chamundipuram', 'Siddhartha Layout', 'Alanahalli', 'Kalyanagiri', 'Udayagiri',
      'Nanjangud', 'T. Narasipura', 'Hunsur', 'Pandavapura', 'Srirangapatna', 'Mandya',
      'Chamarajanagar', 'Mysuru', 'Mysore'
    ];

    let detectedArea = 'Mysuru';
    let detectedDistrict = 'Mysuru';

    for (const area of KNOWN_AREAS) {
      const regex = new RegExp(`\\b${area}\\b`, 'i');
      if (regex.test(cleaned)) {
        detectedArea = area;
        if (['Pandavapura', 'Srirangapatna', 'Mandya'].some((m) => m.toLowerCase() === area.toLowerCase())) {
          detectedDistrict = 'Mandya';
        } else if (['Chamarajanagar'].some((c) => c.toLowerCase() === area.toLowerCase())) {
          detectedDistrict = 'Chamarajanagar';
        }
        break;
      }
    }

    let candidateName = cleaned;
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      candidateName = parts[0].trim();
      const afterDash = parts.slice(1).join('-').trim();
      if (afterDash && detectedArea === 'Mysuru') {
        detectedArea = afterDash;
      }
    } else if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      candidateName = parts[0].trim();
      const afterComma = parts.slice(1).join(',').trim();
      if (afterComma && detectedArea === 'Mysuru') {
        detectedArea = afterComma;
      }
    } else if (detectedArea !== 'Mysuru') {
      const areaRegex = new RegExp(`\\s+${detectedArea}$`, 'i');
      if (areaRegex.test(candidateName)) {
        candidateName = candidateName.replace(areaRegex, '').trim();
      }
    }

    // Clean up any trailing notes or punctuation
    candidateName = candidateName.replace(/[\-,\s]+$/, '').trim();
    if (!candidateName) {
      candidateName = cleaned || 'New Community School';
    }

    // Normalize Mysuru spelling
    if (detectedArea.toLowerCase() === 'mysore') detectedArea = 'Mysuru';
    if (detectedDistrict.toLowerCase() === 'mysore') detectedDistrict = 'Mysuru';

    let board = 'STATE BOARD';
    if (/\bcbse\b/i.test(rawLine)) board = 'CBSE';
    else if (/\bicse\b/i.test(rawLine)) board = 'ICSE';

    let schoolType = 'PRIMARY';
    if (/\b(pre[\s-]?school|play[\s-]?school|montessori|nursery|kindergarten|kidz|kids|toddler)\b/i.test(candidateName)) {
      schoolType = 'PRE-SCHOOL';
    } else if (/\b(high[\s-]?school|secondary)\b/i.test(candidateName)) {
      schoolType = 'HIGH SCHOOL';
    } else if (/\b(composite|pu\b|junior college)\b/i.test(candidateName)) {
      schoolType = 'COMPOSITE';
    }

    return {
      school_name: candidateName,
      area: detectedArea,
      district: detectedDistrict,
      board,
      school_type: schoolType,
      address: `${candidateName}, ${detectedArea}, ${detectedDistrict}`,
    };
  }
}

export interface AIMatchedSchoolItem {
  rawInput: string;
  matchedSchool: SchoolData | null;
  confidence: number;
  matchMethod: 'CODE_EXACT' | 'NAME_AND_AREA' | 'S_NO_EXACT' | 'FUZZY_NAME' | 'LLM_SEMANTIC' | 'UNMATCHED' | 'NEW_AUTO_CREATE';
  matchExplanation: string;
  isRevisit: boolean;
  proposedVisitType: 'FIRST_VISIT' | 'REVISIT';
  proposedStatus: 'VISITED' | 'REVISITED' | 'NOT VISITED';
  proposedOutcome: string;
  notes?: string;
  warnings?: string[];
  shouldSkipVisit?: boolean;
  newSchoolCandidate?: {
    school_name: string;
    area: string;
    district: string;
    board: string;
    school_type: string;
    address: string;
  };
}

export interface AIParsedVisitListResult {
  totalExtracted: number;
  matchedCount: number;
  unmatchedCount: number;
  newSchoolsCount: number;
  itemsToMarkCount: number;
  firstVisitsCount: number;
  revisitsCount: number;
  skippedCount: number;
  items: AIMatchedSchoolItem[];
}

