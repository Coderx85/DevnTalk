import { db, usersTable, workspacesTable, workspaceUsersTable } from "@/db";
import { aj } from "@/lib";
import { APIResponse, CreateWorkspaceResponse } from "@/types";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<APIResponse<CreateWorkspaceResponse>>> {
  try {
    const { name } = await req.json();
    const user = await currentUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const check = await aj.protect(req, { userId: user.id, requested: 5 });

    if (check.isDenied()) {
      return NextResponse.json({
        success: false,
        error: "Rate limit exceeded",
      });
    }

    const username = user.username;
    const userId = user.id;

    // Check if user exists
    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .execute();

    // console.log('User:::: \n', dbUser);
    if (!dbUser || dbUser.length === 0 || !dbUser[0]?.id) {
      console.log("User not found with username:", username);
      return NextResponse.json({
        success: false,
        error: `User not found with username: ${username}`,
      });
    }

    const checkWorkspace = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.name, name))
      .execute();

    if (checkWorkspace && checkWorkspace.length > 0) {
      console.log("Workspace already exists with Name:", name);
      return NextResponse.json(
        {
          success: false,
          error: `Workspace already exists with Name: ${name}`,
        },
        { status: 400 },
      );
    }

    // Create workspace
    const workspace = await db
      .insert(workspacesTable)
      .values({
        name,
        createdBy: dbUser[0]?.id,
      })
      .returning();

    if (!workspace) {
      console.log(
        "Cannot create workspace with Name:",
        name,
        "and createdBy:",
        username,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create workspace with Name: ${name} and createdBy: ${username}`,
        },
        { status: 400 },
      );
    }

    // Update user with workspaceId
    const updateUser = await db
      .update(usersTable)
      .set({
        workspaceId: workspace[0]?.id,
        role: "admin",
        updatedAt: new Date(),
      })
      .execute();

    if (!updateUser) {
      console.log("Cannot update user with workspaceId:", workspace[0]?.id);
      return NextResponse.json({
        success: false,
        error: `Cannot update user with workspaceId: ${workspace[0]?.id}`,
      });
    }

    // Update user metadata
    (await clerkClient()).users.updateUserMetadata(dbUser[0]?.clerkId, {
      publicMetadata: {
        role: "member",
      },
    });

    // Update the worksapceUSersTable
    const workspaceUsers = await db
      .insert(workspaceUsersTable)
      .values({
        name: dbUser[0]?.userName,
        userId: dbUser[0]?.id,
        workspaceId: workspace[0]?.id,
        workspaceName: workspace[0]?.name,
        role: "admin",
        updatedAt: new Date(),
      })
      .returning();

    if (!workspaceUsers) {
      console.log(
        "Cannot update workspaceUsersTable with workspaceId:",
        workspace[0]?.id,
        "and userId:",
        dbUser[0]?.id,
      );
      return NextResponse.json({
        success: false,
        error: `Cannot update workspaceUsersTable with workspaceId: ${workspace[0]?.id} and userId: ${dbUser[0]?.id}`,
      });
    }

    console.log("Workspace:::: \n", workspace);
    console.log("Workspace created successfully");
    return NextResponse.json({
      success: true,
      data: {
        ...workspace[0],
        members: [workspaceUsers[0].userId],
      },
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: `Failed to create workspace:: \n ${error}`,
    });
  }
}
