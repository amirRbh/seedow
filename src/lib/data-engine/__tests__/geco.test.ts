import { describe, expect, it } from "vitest";
import {
  buildDownloadUrl,
  mapCompartmentList,
  mapDocuments,
  mapIdentity,
  mapRef,
} from "../sources/geco.server";

// Extraits RÉELS de l'API GECO (FR0010752543 = LAZARD CREDIT FI SRI), capturés
// en direct — pas des mocks inventés, de vraies réponses du back-office AMF.
const REF = {
  idInterne: 15714,
  cmpId: "c33723",
  parId: "sh40882",
  isin: "FR0010752543",
  parNom: "RVC EUR",
};
const COMPARTMENT = {
  cmpNom: "LAZARD CREDIT FI SRI",
  gestionnaire: "LAZARD FRERES GESTION",
  gestionnaireAssocie: { codeLei: "969500X727PNIAL33P77" },
  prdDomcltnLib: "France",
  prdSsNatureLib: "FCP - Fonds commun de placement",
  cmpClssFndAmfLib: "Obligations et/ou titres de créances internationaux",
};
const SHARE = {
  parNom: "RVC EUR",
  parRefDevCode: "EUR",
  parDateCreation: "2009-05-04",
  parStatutLib: "Vivant",
};
const DOCS = [
  {
    idInterne: 134157,
    docTypeLib: "DIC PRIIPS toutes opérations",
    dateEffet: "2022-12-23",
    docFormat: "pdf",
  },
];

describe("GECO mappers (payloads réels)", () => {
  it("mapRef extrait idInterne/cmpId/isin", () => {
    expect(mapRef(REF)).toEqual({
      idInterne: 15714,
      cmpId: "c33723",
      parId: "sh40882",
      isin: "FR0010752543",
      parNom: "RVC EUR",
    });
  });

  it("mapRef rejette un fonds non résolu (idInterne 0) ou vide", () => {
    expect(mapRef({ idInterne: 0, isin: "X" })).toBeNull();
    expect(mapRef({})).toBeNull();
    expect(mapRef(null)).toBeNull();
  });

  it("mapIdentity remonte identité + société de gestion + LEI (niché)", () => {
    const id = mapIdentity(COMPARTMENT, SHARE);
    expect(id.fundName).toBe("LAZARD CREDIT FI SRI");
    expect(id.managementCompany).toBe("LAZARD FRERES GESTION");
    expect(id.managerLei).toBe("969500X727PNIAL33P77");
    expect(id.domicile).toBe("France");
    expect(id.legalNature).toBe("FCP - Fonds commun de placement");
    expect(id.currency).toBe("EUR");
    expect(id.inceptionDate).toBe("2009-05-04");
  });

  it("mapDocuments construit l'URL de téléchargement officielle", () => {
    const docs = mapDocuments(DOCS);
    expect(docs).toHaveLength(1);
    expect(docs[0].docType).toBe("DIC PRIIPS toutes opérations");
    expect(docs[0].url).toBe(buildDownloadUrl(134157));
    expect(docs[0].url).toContain("/document/download/134157");
  });

  it("mapDocuments : liste vide → aucun document (unavailable)", () => {
    expect(mapDocuments([])).toEqual([]);
    expect(mapDocuments(null)).toEqual([]);
  });

  it("mapCompartmentList extrait les ISIN valides, ignore les null (payload réel)", () => {
    // Forme réelle de getCompartmentsBycriteria (sharesIsins contient des null).
    const page = mapCompartmentList({
      total: 15737,
      compartmentDtos: [
        { cmpNom: "100% INDICE ACTIONS EURO", sharesIsins: [null] },
        { cmpNom: "117 EURO LT", sharesIsins: ["FR0013336385"] },
        { cmpNom: "X", sharesIsins: ["FR0013336385", "LU1861134382", "pas-un-isin"] },
      ],
    });
    expect(page.total).toBe(15737);
    expect(page.isins).toEqual(["FR0013336385", "LU1861134382"]); // dédupliqué, filtré
  });
});
