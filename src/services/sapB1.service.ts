import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { env } from "../config/env";

interface B1Session {
  b1Session: string;
  routeId: string;
  expiresAt: number;
}

class SapB1Service {
  private readonly client: AxiosInstance;
  private session: B1Session | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: env.sapB1.baseUrl,
      timeout: 30000
    });
  }

  private parseCookie(setCookieHeaders: string[] | undefined, cookieName: string): string {
    const rawCookie = (setCookieHeaders ?? []).find((cookie) => cookie.startsWith(`${cookieName}=`));
    if (!rawCookie) {
      throw new Error(`Could not read ${cookieName} from login response cookies`);
    }
    return rawCookie.split(";")[0].split("=")[1];
  }

  private async login(): Promise<void> {
    console.log("[SAP B1] Starting login request", {
      baseUrl: env.sapB1.baseUrl,
      companyDb: env.sapB1.companyDb,
      username: env.sapB1.username
    });

    const response = await this.client.post(
      "/Login",
      {
        CompanyDB: env.sapB1.companyDb,
        UserName: env.sapB1.username,
        Password: env.sapB1.password
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const setCookie = response.headers["set-cookie"] as string[] | undefined;
    const b1Session = this.parseCookie(setCookie, "B1SESSION");
    const routeId = this.parseCookie(setCookie, "ROUTEID");

    this.session = {
      b1Session,
      routeId,
      expiresAt: Date.now() + 2.5 * 60 * 1000
    };

    console.log("[SAP B1] Login successful", {
      status: response.status,
      hasSession: Boolean(this.session.b1Session),
      hasRouteId: Boolean(this.session.routeId),
      sessionTimeoutMinutes: 2.5
    });
  }

  private async ensureSession(): Promise<void> {
    if (!this.session || Date.now() >= this.session.expiresAt) {
      await this.login();
    }
  }

  private async withSessionHeaders(config: AxiosRequestConfig = {}): Promise<AxiosRequestConfig> {
    await this.ensureSession();

    return {
      ...config,
      headers: {
        ...(config.headers ?? {}),
        Cookie: `B1SESSION=${this.session?.b1Session}; ROUTEID=${this.session?.routeId}`,
        "Content-Type": "application/json"
      }
    };
  }

  async get<T = unknown>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.get<T>(url, await this.withSessionHeaders(config));
    console.log("[SAP B1] GET completed", { url, status: response.status });
    return response.data;
  }

  async post<T = unknown>(url: string, body: unknown, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.post<T>(url, body, await this.withSessionHeaders(config));
    console.log("[SAP B1] POST completed", { url, status: response.status });
    return response.data;
  }

  async patch<T = unknown>(url: string, body: unknown, config: AxiosRequestConfig = {}): Promise<T> {
    const response = await this.client.patch<T>(url, body, await this.withSessionHeaders(config));
    console.log("[SAP B1] PATCH completed", { url, status: response.status });
    return response.data;
  }

  async loginTest(): Promise<{ authenticated: boolean }> {
    await this.ensureSession();
    return { authenticated: Boolean(this.session?.b1Session && this.session?.routeId) };
  }

  /** Returns true if an Item master exists in B1 for this ItemCode. */
  async itemExists(itemCode: string): Promise<boolean> {
    const encoded = encodeURIComponent(itemCode);
    try {
      await this.get(`/Items('${encoded}')?$select=ItemCode`);
      return true;
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 404) {
        return false;
      }
      throw error;
    }
  }
}

export const sapB1Service = new SapB1Service();
