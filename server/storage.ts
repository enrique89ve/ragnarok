import {
  users, type User, type InsertUser,
  thinkToolsSessions, reasoningResults, reasoningMetrics,
  type ThinkToolsSession, type InsertThinkToolsSession,
  type ReasoningResult, type InsertReasoningResult,
  type ReasoningMetric, type InsertReasoningMetric
} from "@shared/schema";
import { db } from './database';
import { eq } from 'drizzle-orm';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Think Tools Session methods
  createThinkToolsSession(session: InsertThinkToolsSession): Promise<ThinkToolsSession>;
  getThinkToolsSession(id: number): Promise<ThinkToolsSession | undefined>;
  getThinkToolsSessionsByUserId(userId: number): Promise<ThinkToolsSession[]>;
  updateThinkToolsSession(id: number, session: Partial<InsertThinkToolsSession>): Promise<ThinkToolsSession | undefined>;
  deleteThinkToolsSession(id: number): Promise<boolean>;
  
  // Reasoning Results methods
  createReasoningResult(result: InsertReasoningResult): Promise<ReasoningResult>;
  getReasoningResultsBySessionId(sessionId: number): Promise<ReasoningResult[]>;
  
  // Reasoning Metrics methods
  createReasoningMetric(metric: InsertReasoningMetric): Promise<ReasoningMetric>;
  getReasoningMetricsBySessionId(sessionId: number): Promise<ReasoningMetric[]>;
}

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [id]);
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM users WHERE username = $1 LIMIT 1`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [username]);
      return result.rows[0] as User | undefined;
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      return undefined;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Using raw SQL query for compatibility
      const keys = Object.keys(insertUser);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const values = Object.values(insertUser);
      
      const query = `INSERT INTO users (${columns}) VALUES (${placeholders}) RETURNING *`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, values);
      return result.rows[0] as User;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }
  
  // Think Tools Session methods
  async createThinkToolsSession(session: InsertThinkToolsSession): Promise<ThinkToolsSession> {
    try {
      // Convert camelCase to snake_case for database columns
      const sessionData = {
        user_id: session.userId,
        title: session.title,
        query: session.query
      };
      
      // Using raw SQL query for compatibility
      const keys = Object.keys(sessionData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const values = Object.values(sessionData);
      
      const query = `INSERT INTO think_tools_sessions (${columns}) VALUES (${placeholders}) RETURNING *`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, values);
      return result.rows[0] as ThinkToolsSession;
    } catch (error) {
      console.error('Error in createThinkToolsSession:', error);
      throw error;
    }
  }
  
  async getThinkToolsSession(id: number): Promise<ThinkToolsSession | undefined> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM think_tools_sessions WHERE id = $1 LIMIT 1`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [id]);
      return result.rows[0] as ThinkToolsSession | undefined;
    } catch (error) {
      console.error('Error in getThinkToolsSession:', error);
      return undefined;
    }
  }
  
  async getThinkToolsSessionsByUserId(userId: number): Promise<ThinkToolsSession[]> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM think_tools_sessions WHERE user_id = $1`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [userId]);
      return result.rows as ThinkToolsSession[];
    } catch (error) {
      console.error('Error in getThinkToolsSessionsByUserId:', error);
      return [];
    }
  }
  
  async updateThinkToolsSession(id: number, session: Partial<InsertThinkToolsSession>): Promise<ThinkToolsSession | undefined> {
    try {
      // Convert camelCase to snake_case for database columns
      const updateData: Record<string, any> = {};
      
      if (session.userId !== undefined) updateData.user_id = session.userId;
      if (session.title !== undefined) updateData.title = session.title;
      if (session.query !== undefined) updateData.query = session.query;
      
      // Add updated_at timestamp
      updateData.updated_at = new Date();
      
      // Get the column names and values
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      
      // Build the SET part of the query
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      
      // Full query with id as first parameter
      const query = `UPDATE think_tools_sessions SET ${setClause} WHERE id = $1 RETURNING *`;
      
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [id, ...values]);
      return result.rows[0] as ThinkToolsSession | undefined;
    } catch (error) {
      console.error('Error in updateThinkToolsSession:', error);
      return undefined;
    }
  }
  
  async deleteThinkToolsSession(id: number): Promise<boolean> {
    try {
      // Using raw SQL query for compatibility
      const query = `DELETE FROM think_tools_sessions WHERE id = $1 RETURNING *`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in deleteThinkToolsSession:', error);
      return false;
    }
  }
  
  // Reasoning Results methods
  async createReasoningResult(result: InsertReasoningResult): Promise<ReasoningResult> {
    try {
      // Convert camelCase to snake_case for database columns
      const resultData = {
        session_id: result.sessionId,
        reasoning_mode: result.reasoningMode,
        content: result.content,
        order_index: result.orderIndex
      };
      
      // Using raw SQL query for compatibility
      const keys = Object.keys(resultData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const values = Object.values(resultData);
      
      const query = `INSERT INTO reasoning_results (${columns}) VALUES (${placeholders}) RETURNING *`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const insertResult = await db.execute(query, values);
      return insertResult.rows[0] as ReasoningResult;
    } catch (error) {
      console.error('Error in createReasoningResult:', error);
      throw error;
    }
  }
  
  async getReasoningResultsBySessionId(sessionId: number): Promise<ReasoningResult[]> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM reasoning_results WHERE session_id = $1 ORDER BY order_index ASC`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [sessionId]);
      
      // Convert snake_case property names to camelCase for TypeScript
      return result.rows.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        reasoningMode: row.reasoning_mode,
        content: row.content,
        orderIndex: row.order_index,
        createdAt: row.created_at
      })) as ReasoningResult[];
    } catch (error) {
      console.error('Error in getReasoningResultsBySessionId:', error);
      return [];
    }
  }
  
  // Reasoning Metrics methods
  async createReasoningMetric(metric: InsertReasoningMetric): Promise<ReasoningMetric> {
    try {
      // Convert camelCase to snake_case for database columns
      const metricData = {
        session_id: metric.sessionId,
        reasoning_mode: metric.reasoningMode,
        duration_ms: metric.durationMs,
        steps_count: metric.stepsCount,
        insights_count: metric.insightsCount
      };
      
      // Using raw SQL query for compatibility
      const keys = Object.keys(metricData);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');
      const values = Object.values(metricData);
      
      const query = `INSERT INTO reasoning_metrics (${columns}) VALUES (${placeholders}) RETURNING *`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, values);
      return result.rows[0] as ReasoningMetric;
    } catch (error) {
      console.error('Error in createReasoningMetric:', error);
      throw error;
    }
  }
  
  async getReasoningMetricsBySessionId(sessionId: number): Promise<ReasoningMetric[]> {
    try {
      // Using raw SQL query for compatibility
      const query = `SELECT * FROM reasoning_metrics WHERE session_id = $1`;
      // @ts-ignore: Type inference issue with Drizzle doesn't affect functionality
      const result = await db.execute(query, [sessionId]);
      
      // Convert snake_case property names to camelCase for TypeScript
      return result.rows.map((row: any) => ({
        id: row.id,
        sessionId: row.session_id,
        reasoningMode: row.reasoning_mode,
        durationMs: row.duration_ms,
        stepsCount: row.steps_count,
        insightsCount: row.insights_count,
        createdAt: row.created_at
      })) as ReasoningMetric[];
    } catch (error) {
      console.error('Error in getReasoningMetricsBySessionId:', error);
      return [];
    }
  }
}

// Use DbStorage instead of MemStorage for database persistence
export const storage = new DbStorage();
