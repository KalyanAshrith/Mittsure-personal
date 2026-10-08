import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      settings: settings
        ? {
            ...settings,
            google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY || '',
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const updated = await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        user_name: body.user_name,
        user_role: body.user_role,
        company: body.company,
        base_address: body.base_address,
        base_latitude: body.base_latitude !== undefined ? parseFloat(body.base_latitude) : undefined,
        base_longitude: body.base_longitude !== undefined ? parseFloat(body.base_longitude) : undefined,
        working_radius_km: body.working_radius_km !== undefined ? parseFloat(body.working_radius_km) : undefined,
        default_daily_schools: body.default_daily_schools !== undefined ? parseInt(body.default_daily_schools, 10) : undefined,
        preferred_travel_mode: body.preferred_travel_mode,
        gps_verification_radius_meters: body.gps_verification_radius_meters !== undefined ? parseInt(body.gps_verification_radius_meters, 10) : undefined,
        target_total_schools: body.target_total_schools !== undefined ? parseInt(body.target_total_schools, 10) : undefined,
        target_schools_per_week: body.target_schools_per_week !== undefined ? parseInt(body.target_schools_per_week, 10) : undefined,
        target_completion_date: body.target_completion_date,
        mom_pitch: body.mom_pitch,
        junior_quest_pitch: body.junior_quest_pitch,
      },
      create: {
        id: 'default',
        user_name: body.user_name || 'Nichhenametla Kalyan Ashrith',
        user_role: body.user_role || 'Field Representative / School Outreach Representative',
        company: body.company || 'Mittsure Technologies LLP',
        base_address: body.base_address || '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru, Karnataka 570009',
        base_latitude: parseFloat(body.base_latitude) || 12.3021,
        base_longitude: parseFloat(body.base_longitude) || 76.6178,
        working_radius_km: parseFloat(body.working_radius_km) || 25.0,
        default_daily_schools: parseInt(body.default_daily_schools, 10) || 7,
        preferred_travel_mode: body.preferred_travel_mode || 'TWO_WHEELER',
        gps_verification_radius_meters: parseInt(body.gps_verification_radius_meters, 10) || 150,
        target_total_schools: parseInt(body.target_total_schools, 10) || 487,
        target_schools_per_week: parseInt(body.target_schools_per_week, 10) || 35,
        target_completion_date: body.target_completion_date || '2026-11-30',
        mom_pitch: body.mom_pitch,
        junior_quest_pitch: body.junior_quest_pitch,
      },
    });

    const penv: Record<string, string | undefined> = process.env;
    if (body.google_maps_api_key !== undefined) {
      penv['GOOGLE_MAPS_API_KEY'] = body.google_maps_api_key;
      penv['NEXT_PUBLIC_' + 'GOOGLE_MAPS_API_KEY'] = body.google_maps_api_key;
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          envContent = envContent.replace(/GOOGLE_MAPS_API_KEY=".*"/g, `GOOGLE_MAPS_API_KEY="${body.google_maps_api_key}"`);
          envContent = envContent.replace(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=".*"/g, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="${body.google_maps_api_key}"`);
          fs.writeFileSync(envPath, envContent, 'utf8');
        }
      } catch (e) {
        console.error('Failed to write to .env:', e);
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        google_maps_api_key: penv['GOOGLE_MAPS_API_KEY'] || '',
      },
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', details: error.message },
      { status: 500 }
    );
  }
}
