import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse, setResponse } from '../../common/response/set-response';
import { Row } from '../../database/oracle-types';
import { MenuRepository } from './menu.repository';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Порт reduceMenu: плоский список ACCESS1/2/3 → дерево.
 * Проверки строго `=== null`, имена полей как в оригинале.
 */
function reduceMenu(content: Row[]): any[] {
  const array_: any[] = [];
  let params: any = {};

  const parent = content.filter((element) => {
    return element.ACCESS1_ID !== null;
  });

  parent.map((task) => {
    params = {};
    params.NAME = task.NAME;
    params.ACCESS1_ID = task.ACCESS1_ID;
    params.key = task.KEY_;
    if (task.LINK === null) {
      const childObject = content.filter((element) => {
        return element.ACCESS2_ID !== null && element.LINK_1 === task.ACCESS1_ID;
      });
      let childObj: any = {};
      const childArrays_: any[] = [];
      childObject.map((child) => {
        childObj = {};
        childObj.NAME = child.NAME;
        childObj.ACCESS1_ID = task.ACCESS1_ID;
        childObj.ACCESS2_ID = child.ACCESS2_ID;
        childObj.KEY_ = child.KEY_;
        if (child.LINK === null) {
          const childrenObject = content.filter((element) => {
            return (
              element.ACCESS3_ID !== null && element.LINK_1 === task.ACCESS1_ID && element.LINK_2 === child.ACCESS2_ID
            );
          });
          childObj.CHILDREN = childrenObject;
        } else {
          childObj.LINK = child.LINK;
        }
        childArrays_.push(childObj);
      });
      params.CHILDREN = childArrays_;
    } else {
      params.LINK = task.LINK;
    }
    array_.push(params);
  });
  return array_;
}

/** /menu — меню пользователя по правам доступа. Порт controllers/menu. */
@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly repo: MenuRepository) {}

  /**
   * Как в оригинале: если журнал не найден (null / пустой массив) или меню
   * вернулось null — TypeError → 500 через глобальный фильтр.
   */
  @Get('access')
  @ApiSecurity('token')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  async menuAccess(@CurrentUser() user: JwtUser): Promise<ApiResponse<any[]>> {
    const journal = (await this.repo.getUserByJournal(user.journal)) as Row[];
    const menu = (await this.repo.access(journal[0].USER_)) as Row[];
    const result = reduceMenu(menu);
    return setResponse(result);
  }
}
