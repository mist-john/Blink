import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PublicKey } from '@solana/web3.js';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Adresin geçerli bir Solana adresi olup olmadığını kontrol et
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    // Token'ı veritabanında ara
    const token = await prisma.token.findUnique({
      where: { address }
    });

    // Token bulunamadıysa veya aktif değilse
    if (!token || !token.isActive) {
      return NextResponse.json({ isActive: false });
    }

    return NextResponse.json({ 
      isActive: true,
      token
    });

  } catch (error) {
    console.error('Token check error:', error);
    return NextResponse.json(
      { error: 'Failed to check token' },
      { status: 500 }
    );
  }
} 