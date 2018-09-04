# fidelisa_node

## Docker

### Ports
```
EXPOSE 5672
```

### Environments

```
NODE_ENV      : ( development || production )
FIDELISA_PG   : pg://user:password@host:port/database
FIDELISA_PORT : <port> (default: 5672)
```

nb: You can copy it into a file named `.env`