import { PrismaWatchRepository } from "../prisma-watch.repository";
import { WatcherPrismaService } from "../watcher-prisma.service";

describe("LinkedIn repost persistence", () => {
  it.each([
    ["https://ca.linkedin.com/jobs/view/old", false],
    ["https://careers.example/requisition-1", true],
  ])(
    "handles an existing observation with application URL %s",
    async (applicationUrl, isNewMatch) => {
      const now = new Date("2026-11-06T12:00:00Z");
      const before = new Date("2026-10-01T12:00:00Z");
      const existing = {
        id: "old-observation",
        fingerprint: "old-source-id",
        source: "linkedin",
        normalizedCompany: "imco",
        normalizedTitle: "ai strategy intern",
        normalizedLocation: "toronto ontario",
        title: "AI Strategy Intern",
        applicationUrl,
        canonicalKey: "legacy-key-with-linkedin-url",
        canonicalEpisodeKey: "already-notified",
        canonicalEpisodeStartedAt: null,
        firstSeenAt: before,
        lastSeenAt: new Date("2026-11-05T12:00:00Z"),
      };
      const sent = {
        id: "existing-match",
        watchId: "watch",
        observedJobId: existing.id,
        canonicalEpisodeKey: existing.canonicalEpisodeKey,
        notificationState: "sent",
        matchedTerms: [],
        score: 79,
        scoreBreakdown: {},
        status: "new",
        firstMatchedAt: before,
        lastMatchedAt: before,
      };
      const transaction = {
        observedJob: {
          findMany: jest.fn().mockResolvedValue([existing]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async ({ data }) => ({
            ...data,
            id: "new-observation",
            createdAt: now,
            updatedAt: now,
          })),
        },
        watchMatch: {
          findUnique: jest
            .fn()
            .mockImplementation(async ({ where }) =>
              where.watchId_canonicalEpisodeKey?.canonicalEpisodeKey ===
              sent.canonicalEpisodeKey
                ? sent
                : null,
            ),
          update: jest
            .fn()
            .mockImplementation(async ({ data }) => ({ ...sent, ...data })),
          create: jest.fn().mockImplementation(async ({ data }) => ({
            ...data,
            id: "new-match",
          })),
        },
      };
      const repository = new PrismaWatchRepository({
        $transaction: async (work: (tx: unknown) => Promise<unknown>) =>
          work(transaction),
      } as unknown as WatcherPrismaService);
      const result = await repository.persistObservationAndMatch({
        observedJob: {
          fingerprint: "new-source-id",
          source: "linkedin",
          normalizedCompany: existing.normalizedCompany,
          normalizedTitle: existing.normalizedTitle,
          normalizedLocation: existing.normalizedLocation,
          title: existing.title,
          canonicalKey: "current-key",
          canonicalEpisodeKey: "would-repeat",
          canonicalEpisodeStartedAt: now,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        canonicalEpisodeAnchorWindowMs: 14 * 86400000,
        match: {
          watchId: "watch",
          canonicalEpisodeKey: "would-repeat",
          score: 79,
          scoreBreakdown: {
            total: 79,
            role: 30,
            internship: 25,
            location: 24,
            company: 0,
            source: 0,
            skills: 0,
            matchedKeywords: [],
            missingRequired: [],
            reasons: [],
          },
          matchedTerms: [],
          status: "new",
          firstMatchedAt: now,
          lastMatchedAt: now,
          notificationState: "pending",
        },
      });
      expect(result.isNewMatch).toBe(isNewMatch);
      if (!isNewMatch) {
        expect(result.match.id).toBe(sent.id);
        expect(result.match.notificationState).toBe("sent");
        expect(result.job.canonicalEpisodeKey).toBe("already-notified");
        expect(result.job.canonicalEpisodeStartedAt).toEqual(before);
      }
      expect(transaction.observedJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: "linkedin",
            normalizedCompany: "imco",
            normalizedTitle: "ai strategy intern",
            normalizedLocation: "toronto ontario",
          }),
        }),
      );
    },
  );
});
