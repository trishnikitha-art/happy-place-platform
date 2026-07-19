import type { Company } from "@/types";
import { company } from "@/config/company";

/**
 * Company data service — INTERFACE.
 * Today reads config; later could read a CMS/API. Components call getCompany().
 */
export interface CompanyService {
  getCompany(): Company;
}

export const mockCompanyService: CompanyService = {
  getCompany: () => company,
};

export const companyService: CompanyService = mockCompanyService;
