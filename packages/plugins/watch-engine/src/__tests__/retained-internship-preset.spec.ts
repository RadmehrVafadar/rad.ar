import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { InMemoryWatchRepository } from "@rad-ar/store-watch-memory/in-memory-watch.repository";
import {
  canadianTechAdjacentInternshipsWatch,
  CANADIAN_TECH_ADJACENT_INTERNSHIPS_PRESET,
} from "../services/canadian-tech-adjacent-internships.preset";
import { defaultInternshipWatch } from "../services/default-watch";
import { DefaultWatchSeederService } from "../services/default-watch-seeder.service";
import { WatchPresetService } from "../services/watch-preset.service";
import { WatchValidationService } from "../services/watch-validation.service";

describe("retained internship preset", () => {
  it("only offers Canadian Tech + Adjacent Internships and rejects retired IDs", () => {
    const service = new WatchPresetService(new InMemoryWatchRepository());
    const { id, name, version } = CANADIAN_TECH_ADJACENT_INTERNSHIPS_PRESET;
    expect(service.list()).toEqual([{ id, name, version }]);
    for (const retired of [
      "canadian-tech-internships",
      "prestige-internships-v2",
    ]) {
      expect(() => service.get(retired)).toThrow("Unknown watch preset");
    }
  });

  it("uses the retained template for default creation", () => {
    expect(defaultInternshipWatch()).toEqual(
      canadianTechAdjacentInternshipsWatch(),
    );
  });

  it("seeds the retained watch on an empty database without changing an existing watch", async () => {
    const repository = new InMemoryWatchRepository();
    const seeder = new DefaultWatchSeederService(repository);
    await seeder.onApplicationBootstrap();
    const [watch] = await repository.listWatches();
    expect(watch).toMatchObject(canadianTechAdjacentInternshipsWatch());
    await repository.updateWatch(watch.id, { enabled: true, minimumScore: 77 });
    const before = await repository.listWatches();
    await seeder.onApplicationBootstrap();
    expect(await repository.listWatches()).toEqual(before);
  });

  it("keeps the retained saved JSON configuration valid", () => {
    const example = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../../../../examples/canadian-tech-adjacent-internships.watch.json",
        ),
        "utf8",
      ),
    );
    expect(new WatchValidationService().parseCreate(example).name).toBe(
      CANADIAN_TECH_ADJACENT_INTERNSHIPS_PRESET.name,
    );
  });
});
