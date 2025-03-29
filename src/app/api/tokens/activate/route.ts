import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Token address is required" },
        { status: 400 }
      );
    }

    // Adresin geçerli bir Solana adresi olup olmadığını kontrol et
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana address" },
        { status: 400 }
      );
    }

    // Önce token'ı ara
    let token = await prisma.token.findUnique({
      where: { address }
    });

    // Token yoksa oluştur
    if (!token) {
      token = await prisma.token.create({
        data: {
          address,
          isActive: true
        }
      });
    } 
    // Token varsa aktif hale getir
    else if (!token.isActive) {
      token = await prisma.token.update({
        where: { id: token.id },
        data: { isActive: true }
      });
    }

    return NextResponse.json({
      message: "Token activated successfully",
      token
    });

  } catch (error) {
    console.error('Token activation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate token' },
      { status: 500 }
    );
  }
}
