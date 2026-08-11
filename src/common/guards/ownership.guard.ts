import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Role } from "src/auth/roles.enum";

@Injectable()
export class OwnershipGuard implements CanActivate {

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        const resourceId = request.params.id;

        if (!user) {
            return false;
        }

        if (user.role === Role.ADMIN) {
            return true;
        }

        if (user.userId !== resourceId) {
            throw new ForbiddenException("No tienes permiso para modificar la cuenta de otra persona");
        }

        return true;
    }
}

