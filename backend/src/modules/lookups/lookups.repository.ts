import type { LookupDelegate, LookupWriteInput } from "./lookups.registry.js";

export const lookupsRepository = {
  findMany(delegate: LookupDelegate) {
    return delegate.findMany({ orderBy: { nameKa: "asc" } });
  },

  findById(delegate: LookupDelegate, id: number) {
    return delegate.findUnique({ where: { id } });
  },

  findByKey(delegate: LookupDelegate, key: string) {
    return delegate.findUnique({ where: { key } });
  },

  create(delegate: LookupDelegate, data: LookupWriteInput) {
    return delegate.create({ data });
  },

  update(delegate: LookupDelegate, id: number, data: Partial<LookupWriteInput>) {
    return delegate.update({ where: { id }, data });
  },

  delete(delegate: LookupDelegate, id: number) {
    return delegate.delete({ where: { id } });
  },
};
