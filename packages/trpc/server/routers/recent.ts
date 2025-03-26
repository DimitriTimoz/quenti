import type { SetFolderEntity } from "@quenti/interfaces";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, onboardingProcedure, publicProcedure, enforceBasicAuth } from "../trpc";
import { getBelongingClasses } from "./classes/utils/get-belonging";
import { getRecentFolders } from "./folders/utils/recent";
import { getRecentDrafts, getRecentStudySets } from "./study-sets/utils/recent";

export const recentRouter = createTRPCRouter({
  get: publicProcedure.use(enforceBasicAuth).query(async ({ ctx, input }) => {
    // Log pour le débogage
    console.log("recent.get - Contexte complet:", {
      session: ctx.session,
      headers: ctx.req.headers,
      cookies: ctx.req.cookies,
      input,
    });
    
    try {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is required",
        });
      }

      const userId = ctx.session.user.id;

      const [sets, folders, drafts, classes] = await Promise.all([
        getRecentStudySets(ctx.prisma, userId),
        getRecentFolders(ctx.prisma, userId),
        getRecentDrafts(ctx.prisma, userId),
        getBelongingClasses(userId),
      ]);

      const entities = [
        ...sets.map((set) => ({
          ...set,
          entityType: "set" as const,
          slug: null,
          numItems: set._count.terms,
        })),
        ...drafts.map((draft) => ({
          ...draft,
          draft: true,
          entityType: "set" as const,
          viewedAt: draft.savedAt,
          slug: null,
          numItems: draft._count.terms,
        })),
        ...folders.map((folder) => ({
          ...folder,
          entityType: "folder" as const,
          numItems: folder._count.studySets,
        })),
      ];

      return {
        sets,
        folders,
        classes,
        entities: entities
          .sort((a, b) => {
            const tA = new Date(a.viewedAt || a.createdAt).getTime();
            const tB = new Date(b.viewedAt || b.createdAt).getTime();
            return tB - tA;
          })
          .slice(0, 16),
        drafts,
      };
    } catch (error) {
      console.error("Error in recent.get:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),
});
