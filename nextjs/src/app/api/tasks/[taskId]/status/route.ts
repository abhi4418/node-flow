import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const run = await runs.retrieve(taskId);

    return NextResponse.json({
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    });
  } catch (error) {
    console.error("Error retrieving task status:", error);
    return NextResponse.json({ error: "Failed to retrieve task status" }, { status: 500 });
  }
}
