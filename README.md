# Mini-Wallfer

Mini-Wallfer es una simple implementación de un subconjunto de funcionalidades que ofrece la plataforma universitaria [Wallfer](https://wallfer.com/). Esta se basa en la página de Facebook El Informer de la UA, ya que el creador de la plataforma también es administrador de esta y su primera idea fue la de hacer "El Informer pero en aplicación". En ella, los usuarios registrados pueden realizar publicaciones (posts) para que el resto de usuarios puedan visualizarlos, darle a "Like", comentar, entre otras cosas. También ofrecía algunas otras funcionalidades como la de publicar en anónimo, agrupar por categoría y universidad, poder agregar a amigos, tener "feelings" (como en Tinder) así como un chat y demás, pero estas no han sido implementadas en la práctica.

El esquema de recursos inicial es el siguiente:

![esquema-inical](https://image.ibb.co/m5sFO6/diagrama_practica1.png)

Se han implementado los dos recursos más básicos del anterior diagrama:

* Usuario:
  * ID
  * Nombre de usuario
  * Contraseña
  * Primer nombre
  * Segundo nombre
  * Fecha de nacimiento
  * Publicaciones
* Post:
  * ID
  * Texto
  * Propietario

Para cada uno de los recursos, se ha creado cada una de las operaciones HTTP para poder operar con estos, ofreciéndonos la posibilidad de suplir los siguientes casos de uso:

* Un usuario puede registrarse y loguearse (hablaremos de la autenticación) mediante su nombre de usuario y contraseña
* Un usuario puede obtener la información de otros usuarios, bien a través del listado de todos estos o bien accediendo a uno.
* Un usuario puede modificar sus datos en cualquier momento.
* Un usuario puede darse de baja de la plataforma eliminando sus datos de usuario.
* Un usuario puede publicar posts y estos quedarán vinculados a su cuenta.
* Un usuario podrá obtener tanto un listado de posts como uno sólo, sabiendo quién es el usuario que lo publicó.
* Un usuario también podrá ver los posts específicos que ha publicado cierto usuario.
* Un usuario podrá borrar cualquiera de sus posts en cualquier momento.

Además de estos casos de uso, también se ha implementado un sistema de autenticación y autorización que tiene como puntos básicos los siguientes:

* Todos los endpoints están securizados, excepto el de registrar un usuario y el de hacer login.
* Para que un usuario pueda acceder al resto de recursos debe de loguearse. Con esta operación obtendrá un token JWT y podrá autenticarse en el API REST.
* Si el token es manipulado y no se puede procesar, no se logueará correctamente.
* Tampoco lo hará si el token se pueda procesar aunque haya sido manipulado (en el supuesto caso de que puedan desencriptar y reencriptar el payload) si no corresponde a ningún usuario existente en la base de datos.
* En referencia a lo anterior, si un usuario es dado de baja en la plataforma, su token dejará de ser válido.
* También dejará de ser válido el mismo si los datos de este son modificados (si se actualizan sus datos de usuario)
* El token no tiene fecha de caducidad porque no se ha implementado tal funcionalidad pero es muy seguro que en el futuro esto se realice.

Por último, también disponemos de una extensa batería de pruebas (34) que prueban casi todos los endpoints (los PUT no me deja hacerlos no sé por qué motivo) de forma extensa con varios casos de prueba para cada uno de ellos. Además, todo el testeo se realiza en un entorno de pruebas preparado con una base de datos y un servidor Express especiales aislados del general (aunque funcionando del mismo modo). Se comprueba con rigurez los resultados obtenidos (código HTTP obtenido, cabeceras recibidas, respuesta esperada, estado de la base de datos tras realizar la operación... Todo depende del caso de prueba también) y la base de datos es limpiada antes de cada caso ejecutado para mantener un estado consistente y aislado para los mismos. Se ha utilizado la librería de aserciones [Chai](http://chaijs.com/) (escrito sobre [SuperAgent](http://visionmedia.github.io/superagent/)) que permite especificar los tests de forma fluida y con un estilo típico de una metología de testing BDD.

Esto es todo respecto a la parte obligatoria de la práctica. En cuanto a la optativa:

* Se ha implementado un sistema de persistencia de datos mediante el ORM [TypeORM](http://typeorm.io) y un fichero SQLite (aunque el motor puede cambiarse mediante un fichero de configuración). La base de datos se puede popular con [Faker.js](https://github.com/marak/Faker.js/) mediante un pequeño script CLI que podemos ejecutar desde la raíz del proyecto como:

```bash
ts-node seedDb.ts --help # Se necesita ts-node (npm i -g ts-node), un intérprete de Typescript
ts-node  seedDb.ts --seed 1718 --users 17 --min-user-posts 0 --max-user-posts 10 --min-words 6 --max-words 50 #Un ejemplo de ejecución
```

* **NO** se ha implementado el acceso a un API externo por falta de tiempo y porque he preferido centrarme en otros asuntos de la práctica que comentaré al final.
* Se ha documentado cada uno de los endpoints del API REST mediante OpenAPI.
  * La documentación se genera mediante el plugin de node [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc), que permite especificar un endpoint desde la documentación de un método (que será el asociado a ese endpoint) mediante el formato YAML. Las propiedades generales van en un script aparte, que es donde también se configuran las entidades donde el plugin debe de buscar las especificaciones.
  * La interpretación de esa especificación se realiza mediante el plugin [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express), que permite tener los ficheros de distribución de swagger como si de un middleware de Express se tratara, el cual hasta podemos configurar programáticamente.
* Se ha implementado HATEOAS sobre todos los recursos que devuelve el API REST mediante el RFC [draft-kelly-json-hal-08](https://tools.ietf.org/html/draft-kelly-json-hal-08) (también hay un resumen en la página que lo enlaza, [HAL - Hypertext Application Language](http://stateless.co/hal_specification.html)).
* El API está desplegado en Heroku. Puedes probarlo en mini-wallfer.herokuapp.com.
* El paginado (obligatorio en todos los listados) también está implementado gracias otra vez a TypeORM.

Fuera de lo obligatorio y lo opcional de esta práctica, quisiera destacar los siguientes aspectos:

* El API REST está implementado en TypeScript, lo cual ha supuesto un reto extra aunque también ha ayudado en ciertas partes del desarrollo.
* Toda la lógica de negocio está bien modularizada en ficheros separados: conexión con la base de datos, configuración del servidor, cada modelo y cada controlador en una clase que está en un único fichero... Hasta las rutas de las que dispone el servidor están especificadas en un fichero específico (aunque soy más fan de las anotaciones en los métodos, estilo Spring).
* Existe una muy precisa validación de los modelos a la hora de ser insertados/modificados gracias a los plugins [class-transformer](https://github.com/pleerock/class-transformer), [class-validator](https://github.com/pleerock/class-validator) y el wrapper de ambos [class-transformer-validator](https://github.com/19majkel94/class-transformer-validator). Se puede entender su funcionamiento revisando los tests `UserController -> UserController::save tests -> Should throw UNPROCESSABLE ENTITY if an invalid or incomplete user is sent` o `PostController -> PostController::save tests -> Should throw UNPROCESSABLE ENTITY if an incomplete post is sent`, o también a través de swagger-ui de forma interactiva (pero manual).
* Además de la autenticación, se comprueba la autorización de acceso a ciertos recursos: sólo un usuario puede modificar/borrar sus posts.
* El entorno de testing está totalmente aislado y preparado para que las pruebas sean contenidas y repetibles (unas de las características imprescindibles para que los tests sean correctos), además de contener muchos casos de prueba autodocumentados gracias a las aserciones de Chai.

Pavel Razgovorov - pr18@alu.ua.es