import { Injectable } from '@nestjs/common';
import { OracleService } from '../../database/oracle.service';
import { Pool, Row } from '../../database/oracle-types';

/**
 * Порт controllers/menu/repo.js (Access) и controllers/journal/repo.js
 * (getUserByJournal). Роутер /journal в server.js не смонтирован — здесь
 * переносится только функция, которую использует меню.
 */
@Injectable()
export class MenuRepository {
  constructor(private readonly db: OracleService) {}

  /** Пользователь по журналу сессии (основной пул). */
  getUserByJournal(journal: string | number): Promise<Row[] | null> {
    const script = `SELECT * FROM USER_JOURNAL WHERE JOURNAL = :pJournal AND ROWNUM < 2 AND isonline = 1`;
    const params = { pJournal: journal };
    return this.db.select(Pool.Main, script, params, { fn: 'menu', method: 'getMenuAccess' });
  }

  /** Дерево доступных пунктов меню (menu_id = 59) — пул ИАБС. */
  access(userid: unknown): Promise<Row[] | null> {
    const script = `WITH ACCESS1 AS (SELECT access1.user_id  user_      , 
		access1.id       access1_id       ,
		null             access2_id       , 
		null             access3_id       ,
		access1.iD        link_1           ,
		null             link_2           ,
		null             link_3           ,    
		access1.cname    NAME             , 
		access1.lname    SHORTNAME        , 
		to_char(access1.norder)   key_             ,
		access1.pager    LINK 
	 FROM V_ACCESS1 access1 WHERE access1.menu_id = 59 AND access1.user_id  = :userid),
	ACCESS2 AS (SELECT access2.user_id     user_    , 
		null               access1_id      , 
		access2.id         access2_id      ,
		null               access3_id      ,
		ACCESS1.access1_id  link_1         ,                       
		ACCESS2.id          link_2         ,
		null                link_3         ,    
		 access2.cname      NAME            , 
		 access2.lname      SHORTNAME       , 
		 access1.key_ || access2.norder   key_             ,
		 access2.pager      LINK 
	 FROM V_ACCESS2 access2, ACCESS1 WHERE access2.menu_id = 59 AND ACCESS1.access1_id = access2.ACCESS1_ID AND access2.user_id = :userid),
	ACCESS3 AS (SELECT 
			access3.user_id           user_, 
			null                      access1_id, 
			null                      access2_id, 
			access3.id                access3_id, 
			ACCESS2.link_1            link_1,
			ACCESS2.link_2            link_2,
			access3.id                 link_3,    
			access3.cname              NAME, 
			access3.lname              SHORTNAME, 
			access2.key_ || access3.norder   key_             ,
			access3.pager              LINK 
	 FROM V_ACCESS3 access3, ACCESS2 WHERE access3.menu_id = 59 AND access3.access1_id = ACCESS2.LINK_1   AND ACCESS2.access2_id = access3.access2_id AND access3.user_id = :userid)
	 SELECT * FROM (SELECT * FROM ACCESS1  union all SELECT * FROM ACCESS2  union all SELECT * FROM ACCESS3) w ORDER BY access1_id, access2_id, access3_id`;
    const params = { userid };
    return this.db.select(Pool.Iabs, script, params, { fn: 'menu', method: 'getMenuAccess' });
  }
}
