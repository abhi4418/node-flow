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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const dbUserId = await ensureUser(clerkUserId);

    const workflow = await prisma.workflow.findFirst({
      where: { id, userId: dbUserId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const dbUserId = await ensureUser(clerkUserId);
    const { name, description, nodes, edges } = await request.json();

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: dbUserId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        nodes: nodes ?? existing.nodes,
        edges: edges ?? existing.edges,
      },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const dbUserId = await ensureUser(clerkUserId);

    const existing = await prisma.workflow.findFirst({
      where: { id, userId: dbUserId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    await prisma.workflowExecution.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
