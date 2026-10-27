import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateDistanceKm } from '@/lib/haversine';
const pdfParse = require('pdf-parse');

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File | null;
    const representativeName = (formData.get('representativeName') as string)?.trim() || 'Field Representative';
    const phone = (formData.get('phone') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';
    const baseLocation = (formData.get('baseLocation') as string)?.trim() || 'Bogadi 2nd Stage, Mysuru';
    const targetDistrict = (formData.get('targetDistrict') as string)?.trim() || 'Mysuru';
    const dailyGoal = parseInt((formData.get('dailyGoal') as string) || '7', 10);
    const pastedText = (formData.get('pastedText') as string)?.trim() || '';

    let extractedText = pastedText;

    // Parse PDF buffer if uploaded
    if (pdfFile && pdfFile.size > 0) {
      try {
        const bytes = await pdfFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const parsed = await pdfParse(buffer);
        if (parsed.text) {
          extractedText = (extractedText ? extractedText + '\n\n' : '') + parsed.text;
        }
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        // Continue with any pasted text if available
      }
    }

    // Fetch master schools for matching and context
    const masterSchools = await prisma.school.findMany({
      where: {
        district: targetDistrict !== 'ALL' ? targetDistrict : undefined,
      },
      include: {
        visits: {
          where: { is_current_representative: true },
          orderBy: { visit_date: 'desc' },
          take: 1,
        },
      },
      take: 200,
    });

    // Detect mentioned schools or keywords in extracted text
    const lowerText = extractedText.toLowerCase();
    const matchedSchools: any[] = [];
    const detectedSNums: number[] = [];

    // Check for S.No occurrences like #12, S.No 12, S-1234
    const snoMatches = lowerText.match(/(?:s\.?no\.?|#)\s*(\d{1,3})/gi) || [];
    snoMatches.forEach((m) => {
      const num = parseInt(m.replace(/[^\d]/g, ''), 10);
      if (num > 0 && num <= 495 && !detectedSNums.includes(num)) {
        detectedSNums.push(num);
      }
    });

    for (const school of masterSchools) {
      const nameMatch = lowerText.includes(school.school_name.toLowerCase().trim().slice(0, 12));
      const snoMatch = school.s_no ? detectedSNums.includes(school.s_no) : false;
      const idMatch = school.school_id ? lowerText.includes(school.school_id.toLowerCase().trim()) : false;

      if (nameMatch || snoMatch || idMatch) {
        matchedSchools.push(school);
      }
    }

    // If no direct matches were found from PDF text, select the top pending schools in the representative's territory
    let recommendedSchools = matchedSchools;
    if (recommendedSchools.length < dailyGoal) {
      const pendingSchools = masterSchools.filter(
        (s) =>
          !s.visited_by_current_user &&
          s.visit_status !== 'VISITED' &&
          !recommendedSchools.some((rs) => rs.id === s.id)
      );
      recommendedSchools = [...recommendedSchools, ...pendingSchools.slice(0, dailyGoal - recommendedSchools.length)];
    }

    // Determine product pitch and outreach angle for each school
    const formattedSchoolGuides = recommendedSchools.slice(0, Math.max(dailyGoal, 8)).map((s, index) => {
      const isVisited = Boolean(s.visited_by_current_user || s.visit_status === 'VISITED');
      const isEarlyYears =
        ['PRE-SCHOOL', 'PLAY SCHOOL', 'NURSERY', 'KINDERGARTEN'].includes(s.school_type?.toUpperCase()) ||
        s.school_name.toLowerCase().includes('kids') ||
        s.school_name.toLowerCase().includes('montessori');

      let suggestedProduct = 'ThinkTrail & B4/B5 PINAKA Series';
      let productAngle = 'Comprehensive NEP/NCF 2020 curriculum textbooks with teacher manuals and digital support.';
      let pitchScript = `Namaskara / Good morning Ma'am/Sir. I am ${representativeName} from Mittsure. We specialize in curriculum enhancement aligned with NEP 2020 and experiential learning for Karnataka schools.`;

      if (isEarlyYears) {
        suggestedProduct = 'Luma Learn & Junior Power Quest';
        productAngle = 'Foundational Stage play-based learning kits, rhymes, phonics, and holistic development cards.';
        pitchScript = `Hello Ma'am/Sir. I am ${representativeName} from Mittsure Early Years. We offer Luma Learn & Junior Power Quest designed specifically for play-schools, giving young learners hands-on activity workbooks and flashcards that parents love.`;
      } else if (s.board === 'CBSE' || s.board === 'ICSE') {
        suggestedProduct = 'MOM (Maths & Science Olympiad) + ThinkTrail';
        productAngle = 'Competitive Olympiad testing platform with national rank certificates and student recognition.';
        pitchScript = `Good morning Principal Sir/Ma'am. Mittsure's MOM Olympiad provides your CBSE students an accessible national-level bench-marking test with school banners, medals, and participation certificates at zero financial liability to school management.`;
      }

      return {
        stopNumber: index + 1,
        id: s.id,
        s_no: s.s_no,
        school_name: s.school_name,
        area: s.area,
        district: s.district,
        board: s.board,
        school_type: s.school_type,
        visited: isVisited,
        suggestedProduct,
        productAngle,
        pitchScript,
        phone: s.phone || s.contact_number || 'Obtain at Reception',
        principal_name: s.principal_name || 'Head of Institution',
      };
    });

    // Generate Personalized Step-by-Step Supporter Guide
    const supporterGuide = {
      representative: {
        name: representativeName,
        phone,
        email,
        baseLocation,
        targetDistrict,
        dailyGoal,
      },
      greeting: `Welcome aboard, ${representativeName}! Your personalized outreach copilot is initialized for ${targetDistrict}.`,
      dailyBrief: `Your territory schedule contains ${recommendedSchools.length} planned outreach visits today. Target: Complete ${dailyGoal} structured school meetings starting from your base at ${baseLocation}.`,
      morningChecklist: [
        `Sample kit ready: Luma Learn preschool books, ThinkTrail Grade 1-5 samples, and MOM Olympiad brochures.`,
        `Visiting cards & official Mittsure catalog folder handy.`,
        `Two-wheeler vehicle tank checked for ~35 km circuit.`,
        `Phone charged with Google Maps GPS enabled.`,
      ],
      stepByStepPlan: [
        {
          step: 1,
          time: '09:00 AM – 09:30 AM',
          title: 'Morning Launch from Base',
          description: `Depart from ${baseLocation}. Head towards your first school stop in ${formattedSchoolGuides[0]?.area || targetDistrict}. Aim to arrive right as morning assembly concludes.`,
        },
        {
          step: 2,
          time: '09:30 AM – 01:00 PM',
          title: 'Morning Outreach Wave (Prime Principal Window)',
          description: `Cover your first 4 priority institutions. Morning hours are peak decision-maker availability. Ask for the Academic Coordinator or Principal directly.`,
        },
        {
          step: 3,
          time: '01:00 PM – 02:00 PM',
          title: 'Lunch Break & Midday Sync',
          description: `Rest and log your morning visit outcomes (Interested, Follow-up, or Revisit) into your Mittsure CRM to keep your progress updated.`,
        },
        {
          step: 4,
          time: '02:00 PM – 05:00 PM',
          title: 'Afternoon Outreach & Pre-School Focus',
          description: `Complete your remaining ${dailyGoal - 4 > 0 ? dailyGoal - 4 : 3} visits. Pre-schools and composite schools have good afternoon reception before school bus departure.`,
        },
        {
          step: 5,
          time: '05:00 PM – 05:30 PM',
          title: 'Daily Evening Wrap-Up',
          description: `Return safely to ${baseLocation}. Confirm your day count and review tomorrow's planned circuit.`,
        },
      ],
      objectionCheatsheet: [
        {
          objection: '"The Principal is very busy and cannot meet right now."',
          response: `"I completely understand, Ma'am/Sir. I only need 3 minutes to handover our 2026-27 NEP curriculum overview and sample set for the Principal's review. May I leave my card and note their convenient callback time?"`,
        },
        {
          objection: '"We already have a fixed book supplier/publisher."',
          response: `"That is great! Many top schools we partner with also have existing suppliers. Our ThinkTrail series and MOM Olympiad are designed as value-add supplementary programs that do not disturb your core vendor, while giving students national recognition."`,
        },
        {
          objection: '"Our school fee is low, we cannot afford expensive material."',
          response: `"Mittsure specifically engineers economical, tier-tailored packages with bulk school discounts and complimentary digital smart-class material so quality education remains accessible without straining parents."`,
        },
        {
          objection: '"Call us back next month or next term."',
          response: `"Thank you. Curriculum and Olympiad scheduling for the upcoming term closes early. I'll make a quick note on my CRM to follow up on [Date], and I'll leave these 2 sample copies with your office today."`,
        },
      ],
      schools: formattedSchoolGuides,
    };

    return NextResponse.json({
      success: true,
      message: `Supporter plan successfully generated for ${representativeName}`,
      extractedSnippet: extractedText ? extractedText.slice(0, 300) + '...' : 'No text parsed',
      matchedCount: matchedSchools.length,
      supporterGuide,
    });
  } catch (error: any) {
    console.error('Error generating team supporter guide:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process team member supporter guide', details: error.message },
      { status: 500 }
    );
  }
}
