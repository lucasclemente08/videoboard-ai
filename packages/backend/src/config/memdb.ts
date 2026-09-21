/**
 * In-memory database adapter for local dev.
 * Mimics Drizzle ORM API surface: db.select().from().where().orderBy() etc.
 */

type Row = Record<string, any>;
type WhereFn = (row: Row) => boolean;

const tables = new Map<string, Row[]>();

function getTable(name: string): Row[] {
  if (!tables.has(name)) tables.set(name, []);
  return tables.get(name)!;
}

function cloneRow(row: Row): Row {
  return JSON.parse(JSON.stringify(row));
}

function extractTableName(tableObj: any): string {
  // Drizzle tables have a Symbol or internal property
  if (typeof tableObj === 'string') return tableObj;
  // Try common Drizzle internal properties
  const name = tableObj?._?.name
    || tableObj?.config?.name
    || tableObj?.[Symbol.for('drizzle:Name')]
    || tableObj?.name;
  if (name) return name;
  // Fallback: try to stringify
  return String(tableObj);
}

// ---- Drizzle-compatible query builder ----

function createSelectBuilder(tableName: string) {
  let _where: WhereFn | null = null;
  let _limit = Infinity;
  let _offset = 0;
  let _orderBy: { col: string; dir: 'asc' | 'desc' } | null = null;

  const builder = {
    from(_table: any) {
      // tableName already set
      return builder;
    },
    where(fn: WhereFn) {
      _where = fn;
      return builder;
    },
    orderBy(col: any) {
      _orderBy = { col: extractFieldName(col), dir: 'asc' };
      return builder;
    },
    limit(n: number) {
      _limit = n;
      return builder;
    },
    offset(n: number) {
      _offset = n;
      return builder;
    },
    async then(resolve: (value: Row[]) => void) {
      const data = getTable(tableName);
      let result = data.map(cloneRow);
      if (_where) result = result.filter(_where);
      if (_orderBy) {
        result.sort((a, b) => {
          const va = String(a[_orderBy!.col] ?? '');
          const vb = String(b[_orderBy!.col] ?? '');
          return _orderBy!.dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
        });
      }
      result = result.slice(_offset, _offset + _limit);
      resolve(result);
    },
  };
  return builder;
}

function createInsertBuilder(tableName: string) {
  return {
    values(data: Row | Row[]) {
      const rows = Array.isArray(data) ? data : [data];
      const inserted = rows.map((row) => {
        const newRow = {
          id: row.id || crypto.randomUUID(),
          ...row,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        };
        getTable(tableName).push(newRow);
        return cloneRow(newRow);
      });
      return {
        returning: () => Promise.resolve(inserted),
      };
    },
  };
}

function createUpdateBuilder(tableName: string) {
  return {
    set(data: Row) {
      return {
        where(fn: WhereFn) {
          const tableData = getTable(tableName);
          const matched = tableData.filter(fn);
          matched.forEach((row) => {
            Object.assign(row, { ...data, updated_at: new Date().toISOString() });
          });
          return {
            returning: () => Promise.resolve(matched.map(cloneRow)),
          };
        },
      };
    },
  };
}

function createDeleteBuilder(tableName: string) {
  return {
    where(fn: WhereFn) {
      const tableData = getTable(tableName);
      const idx = tableData.findIndex(fn);
      if (idx !== -1) tableData.splice(idx, 1);
      return Promise.resolve();
    },
  };
}

// ---- Drizzle-like db object ----

export function createMemDb() {
  return {
    select(columns?: any) {
      // columns ignored for simplicity
      return {
        from(table: any) {
          const name = extractTableName(table);
          return createSelectBuilder(name);
        },
      };
    },

    insert(table: any) {
      const name = extractTableName(table);
      return createInsertBuilder(name);
    },

    update(table: any) {
      const name = extractTableName(table);
      return createUpdateBuilder(name);
    },

    delete(table: any) {
      const name = extractTableName(table);
      return createDeleteBuilder(name);
    },
  };
}

// ---- Drizzle-compatible helpers ----

function extractFieldName(col: any): string {
  return col?.name || col?.fieldName || col?._?.name || String(col);
}

export function eq(col: any, value: any): WhereFn {
  const colName = extractFieldName(col);
  return (row: Row) => row[colName] === value;
}

export function asc(col: any) {
  return { col: extractFieldName(col), dir: 'asc' };
}

export function desc(col: any) {
  return { col: extractFieldName(col), dir: 'desc' };
}

export const sql = {
  raw: (s: string) => s,
};
