import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

async function ensureUser(clerkUserId: string): Promise<string> {
  let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId: clerkUserId },
    });
  }
  return user.id;
}

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUserId = await ensureUser(clerkUserId);

    const workflows = await prisma.workflow.findMany({
      where: { userId: dbUserId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUserId = await ensureUser(clerkUserId);
    const { name, description, nodes, edges } = await request.json();

    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Untitled Workflow",
        description: description || null,
        nodes: nodes || [],
        edges: edges || [],
        userId: dbUserId,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}
