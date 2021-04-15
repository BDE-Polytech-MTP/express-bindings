import {
  VotesErrorType,
  VotesService,
  VotesServiceError,
} from "@bde-polytech-mtp/base-backend";
import { Pool } from "pg";

export class PostgresVotesService implements VotesService {
  constructor(private db: Pool) {}

  async vote(liste: string | null, userUUID: string): Promise<void> {
    try {
      await this.db.query(
        "INSERT INTO votes (user_uuid, liste) VALUES ($1, $2)",
        [userUUID, liste]
      );
    } catch (e) {
      if (e.constraint === "fk_votes_users") {
        throw new VotesServiceError(
          "Unknown user",
          VotesErrorType.INVALID_USER
        );
      }
      throw new VotesServiceError(
        "Impossible to vote",
        VotesErrorType.INTERNAL
      );
    }
  }

  async getVote(userUUID: string): Promise<string | null> {
    try {
      const result = await this.db.query(
        "SELECT liste FROM votes WHERE user_uuid = $1 ORDER BY voted_on DESC LIMIT 1",
        [userUUID]
      );
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0].liste;
    } catch (e) {
      throw new VotesServiceError(
        "Impossible to retrieve vote",
        VotesErrorType.INTERNAL
      );
    }
  }
}
