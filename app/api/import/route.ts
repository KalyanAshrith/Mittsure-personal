import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows provided for import.' },
        { status: 400 }
      );
    }

    const results = {
      total: rows.length,
      imported: 0,
      skippedDuplicates: 0,
      errors: [] as { row: number; error: string; data: any }[],
    };

    // Preload existing keys for fast duplicate detection
    const existingSchools = await prisma.school.findMany({
      select: {
        id: true,
        school_id: true,
        s_no: true,
        google_place_id: true,
        school_name: true,
        area: true,
      },
    });

    const existingSchoolIds = new Set(existingSchools.map((s) => s.school_id.toUpperCase()));
    const existingSNos = new Set(existingSchools.map((s) => s.s_no));
    const existingPlaceIds = new Set(
      existingSchools.filter((s) => s.google_place_id).map((s) => s.google_place_id!)
    );
    const existingNameAreas = new Set(
      existingSchools.map((s) => `${s.school_name.trim().toLowerCase()}_${s.area.trim().toLowerCase()}`)
    );

    let maxSNo = existingSchools.reduce((max, s) => Math.max(max, s.s_no), 0);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;

      const schoolName = row.school_name || row['School Name'] || row['School'];
      if (!schoolName || schoolName.trim().length < 2) {
        results.errors.push({ row: rowIdx, error: 'Missing or invalid school name', data: row });
        continue;
      }

      const rawSchoolId = row.school_id || row['School ID'] || row['CRM Code'];
      const rawSNo = row.s_no || row['S.No'] || row['s_no'];
      const parsedSNo = rawSNo ? parseInt(rawSNo, 10) : ++maxSNo;
      const schoolId = rawSchoolId ? rawSchoolId.trim() : `S-IMP-${parsedSNo}`;
      const area = row.area || row['Area'] || 'Mysuru';
      const placeId = row.google_place_id || row['Google Place ID'];

      // Duplicate Check 1: school_id
      if (existingSchoolIds.has(schoolId.toUpperCase())) {
        results.skippedDuplicates++;
        continue;
      }

      // Duplicate Check 2: s_no
      if (existingSNos.has(parsedSNo)) {
        results.skippedDuplicates++;
        continue;
      }

      // Duplicate Check 3: Google Place ID
      if (placeId && existingPlaceIds.has(placeId)) {
        results.skippedDuplicates++;
        continue;
      }

      // Duplicate Check 4: normalized school name + area
      const nameAreaKey = `${schoolName.trim().toLowerCase()}_${area.trim().toLowerCase()}`;
      if (existingNameAreas.has(nameAreaKey)) {
        results.skippedDuplicates++;
        continue;
      }

      const board = (row.board || row['Board'] || 'STATE BOARD').toUpperCase();
      const schoolType = (row.school_type || row['School Type'] || 'PRIMARY').toUpperCase();

      const lat = parseFloat(row.latitude || row['Latitude']) || 12.3021;
      const lng = parseFloat(row.longitude || row['Longitude']) || 76.6178;

      try {
        await prisma.school.create({
          data: {
            s_no: parsedSNo,
            school_id: schoolId,
            school_name: schoolName.trim(),
            school_code: row.school_code || schoolId,
            board: ['CBSE', 'ICSE', 'STATE BOARD', 'OTHER'].includes(board) ? board : 'OTHER',
            medium: row.medium || 'English',
            school_type: schoolType,
            category: row.category || 'Primary',
            address: row.address || `${schoolName}, ${area}`,
            area: area,
            taluk: row.taluk || area,
            district: row.district || 'Mysuru',
            state: row.state || 'Karnataka',
            pincode: row.pincode || '570001',
            latitude: lat,
            longitude: lng,
            google_place_id: placeId || null,
            phone: row.phone || null,
            email: row.email || null,
            principal_name: row.principal_name || 'Head / Principal',
            contact_person: row.contact_person || 'Principal',
            contact_number: row.contact_number || row.phone || null,
            student_strength: parseInt(row.student_strength, 10) || 200,
            priority: row.priority || 'MEDIUM',
            opportunity_type: row.opportunity_type || 'C',
            recommended_programme: row.recommended_programme || 'MOM',
            notes: row.notes || 'Imported school record.',
          },
        });

        // Register to cache
        existingSchoolIds.add(schoolId.toUpperCase());
        existingSNos.add(parsedSNo);
        if (placeId) existingPlaceIds.add(placeId);
        existingNameAreas.add(nameAreaKey);
        results.imported++;
      } catch (err: any) {
        results.errors.push({
          row: rowIdx,
          error: err.message,
          data: row,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: results,
      message: `Import processed: ${results.imported} imported, ${results.skippedDuplicates} duplicates skipped, ${results.errors.length} errors.`,
    });
  } catch (error: any) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      { error: 'Failed to process import', details: error.message },
      { status: 500 }
    );
  }
}
